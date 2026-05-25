import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { LearningResource } from '../models/LearningResource';
import { Student } from '../models/Student';
import { getUploadUrl, getPublicUrl, deleteFile } from '../services/s3Service';
import { pushNotification } from './notificationController';

const UPLOAD_ROLES = ['branch_principal', 'it_admin', 'teacher', 'group_admin'];

export async function getResourceUploadUrl(req: Request, res: Response): Promise<void> {
  const { filename, contentType } = req.body;
  if (!filename || !contentType) {
    res.status(400).json({ success: false, message: 'filename and contentType required' });
    return;
  }

  const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
  if (!allowed.includes(contentType)) {
    res.status(400).json({ success: false, message: 'Only PDF and image files are allowed' });
    return;
  }

  const result = await getUploadUrl('resources', filename, contentType);
  if (!result) {
    res.status(503).json({ success: false, message: 'File storage not configured' });
    return;
  }

  res.json({ success: true, data: result });
}

export async function listResources(req: Request, res: Response): Promise<void> {
  const { orgId, branchId, role, id: userId } = req.user!;
  const { classId, subjectId, type, search, bookmarked } = req.query;

  const filter: Record<string, unknown> = { orgId };

  // Group admin sees all branches; others scoped to their branch
  if (role !== 'group_admin') filter.branchId = branchId;

  // Students: force-filter to enrolled class + published only
  if (role === 'student') {
    const student = await Student.findOne({ userId, orgId, status: 'active' }).select('classId').lean();
    if (student) filter.classId = student.classId;
    filter.isPublished = true;
  } else {
    // Teachers see published + their own drafts; admins see all
    if (role === 'teacher') {
      filter.$or = [{ isPublished: true }, { uploadedBy: new Types.ObjectId(userId) }];
    }
    if (classId) filter.classId = classId;
  }

  if (subjectId) filter.subjectId = subjectId;
  if (type) filter.type = type;
  if (bookmarked === 'true') filter.bookmarkedBy = new Types.ObjectId(userId);

  if (search) {
    const re = new RegExp(String(search), 'i');
    filter.$and = [
      ...(filter.$and as any[] ?? []),
      { $or: [{ title: re }, { description: re }, { tags: re }] },
    ];
  }

  const resources = await LearningResource.find(filter)
    .populate('classId', 'name level')
    .populate('subjectId', 'name code')
    .populate('uploadedBy', 'name')
    .sort({ createdAt: -1 })
    .lean();

  // Attach isBookmarked flag per resource
  const uid = userId.toString();
  const enriched = resources.map(r => ({
    ...r,
    isBookmarked: (r.bookmarkedBy as Types.ObjectId[]).some(id => id.toString() === uid),
    bookmarkedBy: undefined, // don't leak the full array to client
  }));

  res.json({ success: true, data: enriched, meta: { total: enriched.length } });
}

export async function createResource(req: Request, res: Response): Promise<void> {
  const { orgId, branchId, role, id: userId } = req.user!;

  if (!UPLOAD_ROLES.includes(role!)) {
    res.status(403).json({ success: false, message: 'Not allowed to upload resources' });
    return;
  }

  const {
    title, description, type, classId, subjectId,
    fileKey, fileName, fileSize, mimeType,
    externalUrl, tags, isPublished,
  } = req.body;

  if (!title || !type || !classId) {
    res.status(400).json({ success: false, message: 'title, type, and classId are required' });
    return;
  }

  if (type === 'video_link' && !externalUrl) {
    res.status(400).json({ success: false, message: 'externalUrl required for video_link type' });
    return;
  }

  if (type !== 'video_link' && !fileKey) {
    res.status(400).json({ success: false, message: 'fileKey required for file-based resources' });
    return;
  }

  const resource = await LearningResource.create({
    orgId,
    branchId,
    classId,
    subjectId: subjectId || undefined,
    uploadedBy: userId,
    title,
    description,
    type,
    fileUrl: fileKey ? getPublicUrl(fileKey) : undefined,
    fileKey,
    fileName,
    fileSize,
    mimeType,
    externalUrl,
    tags: Array.isArray(tags) ? tags : (tags ? String(tags).split(',').map((t: string) => t.trim()).filter(Boolean) : []),
    isPublished: !!isPublished,
  });

  // Notify class students if publishing immediately
  if (isPublished) {
    notifyClassStudents(resource._id as Types.ObjectId, new Types.ObjectId(orgId), new Types.ObjectId(branchId!), new Types.ObjectId(classId), new Types.ObjectId(userId), title).catch(() => {});
  }

  const populated = await LearningResource.findById(resource._id)
    .populate('classId', 'name level')
    .populate('subjectId', 'name code')
    .populate('uploadedBy', 'name')
    .lean();

  res.status(201).json({ success: true, data: populated });
}

export async function updateResource(req: Request, res: Response): Promise<void> {
  const { orgId, role, id: userId } = req.user!;
  const { id } = req.params;

  const resource = await LearningResource.findOne({ _id: id, orgId });
  if (!resource) {
    res.status(404).json({ success: false, message: 'Resource not found' });
    return;
  }

  const isOwner = resource.uploadedBy.toString() === userId;
  const isAdmin = ['branch_principal', 'it_admin', 'group_admin'].includes(role!);
  if (!isOwner && !isAdmin) {
    res.status(403).json({ success: false, message: 'Not allowed to edit this resource' });
    return;
  }

  const wasPublished = resource.isPublished;

  const allowed = ['title', 'description', 'type', 'subjectId', 'tags', 'isPublished', 'externalUrl'];
  for (const key of allowed) {
    if (req.body[key] !== undefined) (resource as any)[key] = req.body[key];
  }
  if (req.body.tags && typeof req.body.tags === 'string') {
    resource.tags = req.body.tags.split(',').map((t: string) => t.trim()).filter(Boolean);
  }
  await resource.save();

  // Notify if just published
  if (!wasPublished && resource.isPublished) {
    notifyClassStudents(resource._id as Types.ObjectId, resource.orgId, resource.branchId, resource.classId, resource.uploadedBy, resource.title).catch(() => {});
  }

  const populated = await LearningResource.findById(resource._id)
    .populate('classId', 'name level')
    .populate('subjectId', 'name code')
    .populate('uploadedBy', 'name')
    .lean();

  res.json({ success: true, data: populated });
}

export async function deleteResource(req: Request, res: Response): Promise<void> {
  const { orgId, role, id: userId } = req.user!;
  const { id } = req.params;

  const resource = await LearningResource.findOne({ _id: id, orgId });
  if (!resource) {
    res.status(404).json({ success: false, message: 'Resource not found' });
    return;
  }

  const isOwner = resource.uploadedBy.toString() === userId;
  const isAdmin = ['branch_principal', 'it_admin', 'group_admin'].includes(role!);
  if (!isOwner && !isAdmin) {
    res.status(403).json({ success: false, message: 'Not allowed to delete this resource' });
    return;
  }

  if (resource.fileKey) await deleteFile(resource.fileKey);
  await resource.deleteOne();

  res.json({ success: true });
}

export async function toggleBookmark(req: Request, res: Response): Promise<void> {
  const { orgId, id: userId } = req.user!;
  const { id } = req.params;

  const resource = await LearningResource.findOne({ _id: id, orgId, isPublished: true });
  if (!resource) {
    res.status(404).json({ success: false, message: 'Resource not found' });
    return;
  }

  const uid = new Types.ObjectId(userId);
  const idx = resource.bookmarkedBy.findIndex(b => b.toString() === userId);
  if (idx === -1) {
    resource.bookmarkedBy.push(uid);
  } else {
    resource.bookmarkedBy.splice(idx, 1);
  }
  await resource.save();

  res.json({ success: true, data: { isBookmarked: idx === -1 } });
}

export async function incrementDownload(req: Request, res: Response): Promise<void> {
  const { orgId } = req.user!;
  await LearningResource.updateOne({ _id: req.params.id, orgId }, { $inc: { downloadCount: 1 } });
  res.json({ success: true });
}

async function notifyClassStudents(
  resourceId: Types.ObjectId,
  orgId: Types.ObjectId,
  branchId: Types.ObjectId,
  classId: Types.ObjectId,
  senderId: Types.ObjectId,
  title: string,
): Promise<void> {
  const students = await Student.find({ orgId, branchId, classId, status: 'active' }).select('userId').lean();
  await Promise.all(students.map(s =>
    pushNotification({
      orgId,
      branchId,
      recipientId: s.userId as Types.ObjectId,
      senderId,
      type: 'resource_uploaded',
      title: 'New Learning Resource',
      message: `"${title}" has been uploaded for your class.`,
      link: `/dashboard/resources`,
    })
  ));
}
