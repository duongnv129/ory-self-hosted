const contextMiddleware = (req, res, next) => {
  // Extract tenant context from headers or URL params
  // Note: tenant can be undefined for Simple RBAC (global operations)
  req.tenantId = req.headers['x-tenant-id'] || req.params.tenantId || undefined;
  req.userId = req.headers['x-user-id'] || req.query.userId || 'mock-user';
  req.userEmail = req.headers['x-user-email'] || req.query.userEmail || 'mock@example.com';
  req.userTraits = {
    tenant_ids: req.tenantId ? [req.tenantId] : [],
    email: req.userEmail
  };
  next();
};

module.exports = {
  contextMiddleware,
};
