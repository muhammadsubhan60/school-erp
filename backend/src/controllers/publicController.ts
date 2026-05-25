import { Request, Response } from 'express';
import { Organization } from '../models/Organization';

/** Public — no auth. Returns org branding for the login page. */
export async function getOrgBySlug(req: Request, res: Response): Promise<void> {
  const slug = String(req.params.slug).toLowerCase();

  const org = await Organization.findOne({ slug })
    .select('name slug logoUrl welcomeMessage status')
    .lean();

  if (!org || org.status === 'suspended') {
    res.status(404).json({ success: false, message: 'School not found' });
    return;
  }

  res.json({
    success: true,
    data: {
      name: org.name,
      slug: org.slug,
      logoUrl: org.logoUrl ?? null,
      welcomeMessage: org.welcomeMessage ?? null,
    },
  });
}
