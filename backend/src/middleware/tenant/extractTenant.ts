import { Request, Response, NextFunction } from 'express';
import { Organization } from '../../models/Organization';
import { env } from '../../config/env';

declare global {
  namespace Express {
    interface Request {
      orgId?: string;
      orgSlug?: string;
      tenantDoc?: import('../../models/Organization').IOrganization;
    }
  }
}

/**
 * Extracts orgId from the subdomain: [slug].edustack.pk → lookup slug → attach orgId.
 * Super Admin routes under app.edustack.pk skip tenant extraction.
 */
export async function extractTenant(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const host = req.hostname;
  const baseDomain = env.baseDomain;

  // app.edustack.pk — Super Admin; skip tenant extraction
  if (host === `app.${baseDomain}` || host === 'localhost') {
    return next();
  }

  // Host doesn't belong to our base domain at all (e.g. Railway/custom domain direct access)
  // Skip tenant extraction — routes will use req.user.orgId from the JWT instead
  if (!host.endsWith(`.${baseDomain}`)) {
    return next();
  }

  const slug = host.slice(0, host.length - baseDomain.length - 1);

  try {
    const org = await Organization.findOne({ slug, status: 'active' }).lean();

    if (!org) {
      res.status(404).json({ success: false, message: 'Organization not found or inactive' });
      return;
    }

    req.orgId = String(org._id);
    req.orgSlug = slug;
    next();
  } catch (err) {
    next(err);
  }
}
