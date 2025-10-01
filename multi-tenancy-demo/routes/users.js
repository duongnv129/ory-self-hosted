const express = require('express');

const router = express.Router();

// Mock user data store (in-memory for demo)
let mockUsers = [
  {
    id: 'user-001',
    email: 'alice@tenant-a.com',
    name: { first: 'Alice', last: 'Smith' },
    tenant_ids: ['tenant-a']
  },
  {
    id: 'user-002',
    email: 'bob@tenant-b.com',
    name: { first: 'Bob', last: 'Johnson' },
    tenant_ids: ['tenant-b']
  },
  {
    id: 'user-003',
    email: 'charlie@tenant-a.com',
    name: { first: 'Charlie', last: 'Brown' },
    tenant_ids: ['tenant-a']
  }
];

// Create a tenant user (mock implementation)
router.post('/create', async (req, res) => {
  try {
    const { email, name } = req.body;

    // Validate required fields
    if (!email || !name) {
      return res.status(400).json({
        error: 'Bad Request: email and name are required'
      });
    }

    // Create mock user
    const newUser = {
      id: `user-${Date.now()}`,
      email: email,
      name: {
        first: name.split(' ')[0] || name,
        last: name.split(' ').slice(1).join(' ') || ''
      },
      tenant_ids: [req.tenantId],
      created_at: new Date().toISOString()
    };

    // Add to mock store
    mockUsers.push(newUser);

    res.status(201).json({
      message: 'User created successfully (mock)',
      tenant_id: req.tenantId,
      user: newUser
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({
      error: 'Failed to create user',
      details: error.message
    });
  }
});

// Get all users for a specific tenant (mock implementation)
router.get('/list', async (req, res) => {
  try {
    // Filter mock users by tenant ID
    const tenantUsers = mockUsers.filter(user =>
      user.tenant_ids && user.tenant_ids.includes(req.tenantId)
    );

    res.json({
      message: 'Users retrieved successfully (mock)',
      tenant_id: req.tenantId,
      users: tenantUsers,
      count: tenantUsers.length
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      error: 'Failed to fetch users',
      details: error.message
    });
  }
});

// Get a specific user if they belong to the tenant (mock implementation)
router.get('/get/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;

    // Find user in mock store
    const user = mockUsers.find(u => u.id === userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if user belongs to this tenant (mock check - always allow for demo)
    res.json({
      message: 'User retrieved successfully (mock)',
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
    const { email, name } = req.body;

    const userIndex = mockUsers.findIndex(u => u.id === userId);
    if (userIndex === -1) {
      return res.status(404).json({ error: 'User not found' });
    }

    const existingUser = mockUsers[userIndex];
    const updatedUser = {
      ...existingUser,
      email: email || existingUser.email,
      name: name ? {
        first: name.split(' ')[0] || name,
        last: name.split(' ').slice(1).join(' ') || ''
      } : existingUser.name,
      updated_at: new Date().toISOString()
    };

    mockUsers[userIndex] = updatedUser;

    res.json({
      message: 'User updated successfully (mock)',
      tenant_id: req.tenantId,
      user: updatedUser
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

    const userIndex = mockUsers.findIndex(u => u.id === userId);
    if (userIndex === -1) {
      return res.status(404).json({ error: 'User not found' });
    }

    const deletedUser = mockUsers.splice(userIndex, 1)[0];

    res.json({
      message: 'User deleted successfully (mock)',
      tenant_id: req.tenantId,
      user: deletedUser
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