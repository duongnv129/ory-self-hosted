const express = require('express');
const axios = require('axios');

const router = express.Router();

// Kratos Admin API configuration
// Use 'kratos' hostname when running in Docker, 'localhost' when running locally
const KRATOS_ADMIN_URL = process.env.KRATOS_ADMIN_URL || 'http://kratos:4434';

// Helper function to create Kratos identity
async function createKratosIdentity(email, name, tenantIds) {
  try {
    const identity = {
      schema_id: 'default',
      traits: {
        email,
        name: {
          first: name.first || '',
          last: name.last || ''
        },
        tenant_ids: tenantIds || []
      }
    };

    const response = await axios.post(`${KRATOS_ADMIN_URL}/admin/identities`, identity);
    return response.data;
  } catch (error) {
    console.error('Kratos API error:', error.response?.data || error.message);
    throw new Error(`Failed to create identity in Kratos: ${error.response?.data?.error?.message || error.message}`);
  }
}

// Helper function to list Kratos identities
async function listKratosIdentities() {
  try {
    const response = await axios.get(`${KRATOS_ADMIN_URL}/admin/identities`);
    return response.data;
  } catch (error) {
    console.error('Kratos API error:', error.response?.data || error.message);
    throw new Error(`Failed to list identities from Kratos: ${error.response?.data?.error?.message || error.message}`);
  }
}

// Helper function to get Kratos identity by ID
async function getKratosIdentity(id) {
  try {
    const response = await axios.get(`${KRATOS_ADMIN_URL}/admin/identities/${id}`);
    return response.data;
  } catch (error) {
    if (error.response?.status === 404) {
      return null;
    }
    console.error('Kratos API error:', error.response?.data || error.message);
    throw new Error(`Failed to get identity from Kratos: ${error.response?.data?.error?.message || error.message}`);
  }
}

// Helper function to update Kratos identity
async function updateKratosIdentity(id, email, name, tenantIds) {
  try {
    const identity = {
      schema_id: 'default',
      traits: {
        email,
        name: {
          first: name.first || '',
          last: name.last || ''
        },
        tenant_ids: tenantIds || []
      },
      state: 'active'
    };

    const response = await axios.put(`${KRATOS_ADMIN_URL}/admin/identities/${id}`, identity);
    return response.data;
  } catch (error) {
    console.error('Kratos API error:', error.response?.data || error.message);
    throw new Error(`Failed to update identity in Kratos: ${error.response?.data?.error?.message || error.message}`);
  }
}

// Helper function to delete Kratos identity
async function deleteKratosIdentity(id) {
  try {
    await axios.delete(`${KRATOS_ADMIN_URL}/admin/identities/${id}`);
    return true;
  } catch (error) {
    if (error.response?.status === 404) {
      return false;
    }
    console.error('Kratos API error:', error.response?.data || error.message);
    throw new Error(`Failed to delete identity from Kratos: ${error.response?.data?.error?.message || error.message}`);
  }
}

// Helper function to map Kratos identity to API response format
function mapIdentityToUser(identity) {
  return {
    id: identity.id,
    email: identity.traits?.email || '',
    name: {
      first: identity.traits?.name?.first || '',
      last: identity.traits?.name?.last || ''
    },
    tenant_ids: identity.traits?.tenant_ids || [],
    created_at: identity.created_at,
    updated_at: identity.updated_at,
    state: identity.state
  };
}

// Helper function to filter users by tenant
function filterUsersByTenant(users, tenantId) {
  if (!tenantId) {
    return users; // Return all users for global operations
  }
  return users.filter(user =>
    user.tenant_ids && user.tenant_ids.includes(tenantId)
  );
}

// Create a tenant user
router.post('/create', async (req, res) => {
  try {
    const { email, name } = req.body;

    // Validate required fields
    if (!email || !name) {
      return res.status(400).json({
        error: 'Bad Request: email and name are required'
      });
    }

    // Parse name field - can be object or string
    let parsedName = {};
    if (typeof name === 'object') {
      parsedName = {
        first: name.first || '',
        last: name.last || ''
      };
    } else if (typeof name === 'string') {
      const nameParts = name.split(' ');
      parsedName = {
        first: nameParts[0] || '',
        last: nameParts.slice(1).join(' ') || ''
      };
    }

    // Create identity in Kratos with tenant_id from context
    const tenantIds = req.tenantId ? [req.tenantId] : [];
    const identity = await createKratosIdentity(email, parsedName, tenantIds);

    const user = mapIdentityToUser(identity);

    res.status(201).json({
      message: 'User created successfully',
      tenant_id: req.tenantId,
      user: user
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({
      error: 'Failed to create user',
      details: error.message
    });
  }
});

// Get all users (globally or for a specific tenant)
router.get('/list', async (req, res) => {
  try {
    // Fetch all identities from Kratos
    const identities = await listKratosIdentities();

    // Map to user format
    const allUsers = identities.map(mapIdentityToUser);

    // Filter by tenant if specified (Tenant/Resource RBAC)
    // Otherwise return all users (Simple RBAC - global operations)
    const users = filterUsersByTenant(allUsers, req.tenantId);

    res.json({
      message: 'Users retrieved successfully',
      tenant_id: req.tenantId,
      users: users,
      count: users.length
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      error: 'Failed to fetch users',
      details: error.message
    });
  }
});

// Get a specific user if they belong to the tenant
router.get('/get/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;

    // Fetch identity from Kratos
    const identity = await getKratosIdentity(userId);

    if (!identity) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = mapIdentityToUser(identity);

    // Check tenant access if tenant_id is specified
    if (req.tenantId && (!user.tenant_ids || !user.tenant_ids.includes(req.tenantId))) {
      return res.status(403).json({
        error: 'Forbidden: User does not belong to this tenant'
      });
    }

    res.json({
      message: 'User retrieved successfully',
      tenant_id: req.tenantId,
      user: user
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({
      error: 'Failed to fetch user',
      details: error.message
    });
  }
});

// Update existing user
router.put('/update/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const { email, name, tenant_ids } = req.body;

    // Fetch existing identity
    const existingIdentity = await getKratosIdentity(userId);
    if (!existingIdentity) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check tenant access if tenant_id is specified
    const existingUser = mapIdentityToUser(existingIdentity);
    if (req.tenantId && (!existingUser.tenant_ids || !existingUser.tenant_ids.includes(req.tenantId))) {
      return res.status(403).json({
        error: 'Forbidden: User does not belong to this tenant'
      });
    }

    // Parse name field - can be object or string
    let parsedName = existingIdentity.traits?.name || { first: '', last: '' };
    if (name) {
      if (typeof name === 'object') {
        parsedName = {
          first: name.first || parsedName.first,
          last: name.last || parsedName.last
        };
      } else if (typeof name === 'string') {
        const nameParts = name.split(' ');
        parsedName = {
          first: nameParts[0] || parsedName.first,
          last: nameParts.slice(1).join(' ') || parsedName.last
        };
      }
    }

    // Update identity in Kratos
    const updatedEmail = email || existingIdentity.traits?.email;
    const updatedTenantIds = tenant_ids !== undefined ? tenant_ids : existingIdentity.traits?.tenant_ids;

    const updatedIdentity = await updateKratosIdentity(
      userId,
      updatedEmail,
      parsedName,
      updatedTenantIds
    );

    const user = mapIdentityToUser(updatedIdentity);

    res.json({
      message: 'User updated successfully',
      tenant_id: req.tenantId,
      user: user
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({
      error: 'Failed to update user',
      details: error.message
    });
  }
});

// Delete user
router.delete('/delete/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;

    // Fetch identity before deletion
    const identity = await getKratosIdentity(userId);
    if (!identity) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = mapIdentityToUser(identity);

    // Check tenant access if tenant_id is specified
    if (req.tenantId && (!user.tenant_ids || !user.tenant_ids.includes(req.tenantId))) {
      return res.status(403).json({
        error: 'Forbidden: User does not belong to this tenant'
      });
    }

    // Delete identity from Kratos
    const deleted = await deleteKratosIdentity(userId);
    if (!deleted) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      message: 'User deleted successfully',
      tenant_id: req.tenantId,
      user: user
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({
      error: 'Failed to delete user',
      details: error.message
    });
  }
});

module.exports = router;
