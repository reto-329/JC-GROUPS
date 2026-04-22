const mongoose = require('mongoose');
const User = require('./models/User');
const Admin = require('./models/Admin');
const Equipment = require('./models/Equipment');
const ServiceArea = require('./models/ServiceArea');
const Contact = require('./models/Contact');

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/jcrentals';

mongoose.connect(MONGODB_URI)
.then(() => {
  console.log('Connected to MongoDB');
  initializeDatabase();
})
.catch((err) => {
  console.error('MongoDB connection error:', err);
});

function initializeDatabase() {
  // Database initialized and ready
  console.log('Database initialized');
}

// User methods using Mongoose model
const UserAPI = {
  create: (userData) => {
    return new Promise((resolve, reject) => {
      const newUser = new User({
        email: userData.email,
        password: userData.password,
        firstName: userData.firstName,
        lastName: userData.lastName,
        phone: userData.phone || ''
      });

      newUser.save()
        .then((user) => {
          resolve({ 
            id: user._id, 
            email: user.email 
          });
        })
        .catch((err) => {
          reject(err);
        });
    });
  },

  findByEmail: (email) => {
    return User.findOne({ email: email.toLowerCase() }).select('+password');
  },

  findById: (id) => {
    return User.findById(id)
      .then((user) => {
        if (user) {
          return {
            id: user._id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            phone: user.phone,
            address: user.address,
            city: user.city,
            state: user.state,
            zipCode: user.zipCode,
            createdAt: user.createdAt
          };
        }
        return null;
      });
  },

  verifyPassword: (plainPassword, hashedPassword) => {
    const bcrypt = require('bcryptjs');
    return bcrypt.compareSync(plainPassword, hashedPassword);
  },

  update: (id, userData) => {
    return new Promise((resolve, reject) => {
      const updateData = {};

      if (userData.firstName) updateData.firstName = userData.firstName;
      if (userData.lastName) updateData.lastName = userData.lastName;
      if (userData.phone) updateData.phone = userData.phone;
      if (userData.address) updateData.address = userData.address;
      if (userData.city) updateData.city = userData.city;
      if (userData.state) updateData.state = userData.state;
      if (userData.zipCode) updateData.zipCode = userData.zipCode;

      updateData.updatedAt = Date.now();

      User.findByIdAndUpdate(id, updateData, { returnDocument: 'after' })
        .then((user) => {
          resolve({ id: user._id, updated: true });
        })
        .catch((err) => {
          reject(err);
        });
    });
  },

  updatePassword: (id, newPassword) => {
    return new Promise((resolve, reject) => {
      const bcrypt = require('bcryptjs');
      const hashedPassword = bcrypt.hashSync(newPassword, 10);

      User.findByIdAndUpdate(id, { password: hashedPassword, updatedAt: Date.now() }, { returnDocument: 'after' })
        .then((user) => {
          resolve({ id: user._id, updated: true });
        })
        .catch((err) => {
          reject(err);
        });
    });
  },

  findAll: () => {
    return User.find({}).lean();
  },

  delete: (id) => {
    return User.findByIdAndDelete(id);
  }
};

// Admin methods using Mongoose model
const AdminAPI = {
  create: (adminData) => {
    return new Promise((resolve, reject) => {
      const newAdmin = new Admin({
        email: adminData.email,
        password: adminData.password,
        firstName: adminData.firstName,
        lastName: adminData.lastName,
        role: adminData.role || 'admin',
        permissions: adminData.permissions || {
          users: false,
          equipment: false,
          orders: false,
          analytics: false
        }
      });

      newAdmin.save()
        .then((admin) => {
          resolve({ id: admin._id, email: admin.email });
        })
        .catch((err) => {
          reject(err);
        });
    });
  },

  findByEmail: (email) => {
    return Admin.findOne({ email: email.toLowerCase() }).select('+password');
  },

  findById: (id) => {
    return Admin.findById(id)
      .then((admin) => {
        if (admin) {
          return {
            id: admin._id,
            email: admin.email,
            firstName: admin.firstName,
            lastName: admin.lastName,
            role: admin.role,
            permissions: admin.permissions,
            isActive: admin.isActive,
            createdAt: admin.createdAt,
            lastLogin: admin.lastLogin
          };
        }
        return null;
      });
  },

  verifyPassword: (plainPassword, hashedPassword) => {
    const bcrypt = require('bcryptjs');
    return bcrypt.compareSync(plainPassword, hashedPassword);
  },

  updateLastLogin: (id) => {
    return Admin.findByIdAndUpdate(id, { lastLogin: Date.now() }, { returnDocument: 'after' });
  }
};

// Equipment methods using Mongoose model
const EquipmentAPI = {
  create: (equipmentData) => {
    return new Promise((resolve, reject) => {
      const newEquipment = new Equipment({
        name: equipmentData.name,
        description: equipmentData.description || '',
        category: equipmentData.category,
        dailyRate: equipmentData.dailyRate,
        weeklyRate: equipmentData.weeklyRate || 0,
        monthlyRate: equipmentData.monthlyRate || 0,
        quantity: equipmentData.quantity,
        quantityAvailable: equipmentData.quantity,
        image: equipmentData.image || null,
        manufacturer: equipmentData.manufacturer || '',
        model: equipmentData.model || ''
      });

      newEquipment.save()
        .then((equipment) => {
          resolve({ id: equipment._id, name: equipment.name });
        })
        .catch((err) => {
          reject(err);
        });
    });
  },

  findAll: () => {
    return Equipment.find({ isActive: true }).lean();
  },

  findById: (id) => {
    return Equipment.findById(id).lean();
  },

  update: (id, equipmentData) => {
    return Equipment.findByIdAndUpdate(id, equipmentData, { returnDocument: 'after' });
  },

  delete: (id) => {
    return Equipment.findByIdAndDelete(id);
  }
};

const Order = require('./models/Order');
const Cart = require('./models/Cart');

module.exports = { 
  User: UserAPI, 
  UserModel: User, 
  Admin: AdminAPI, 
  AdminModel: Admin,
  Equipment: EquipmentAPI,
  EquipmentModel: Equipment,
  Order: Order,
  Cart: Cart,
  ServiceArea: ServiceArea,
  Contact: Contact
};
