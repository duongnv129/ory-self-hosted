const contextMiddleware = (req, res, next) => {
  // Extract tenant context from headers or URL params (no validation)
  req.tenantId = req.headers['x-tenant-id'] || req.params.tenantId || 'default-tenant';
  req.userId = req.headers['x-user-id'] || req.query.userId || 'mock-user';
  req.userEmail = req.headers['x-user-email'] || req.query.userEmail || 'mock@example.com';
  req.userTraits = {
    tenant_ids: [req.tenantId],
    email: req.userEmail
  };
  next();
};

module.exports = {
  contextMiddleware,
};
