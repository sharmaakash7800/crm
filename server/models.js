const mongoose = require('mongoose');

// Lead Schema
const leadSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  phone: { type: String, default: '', trim: true },
  email: { type: String, default: '', trim: true },
  company: { type: String, default: '', trim: true },
  city: { type: String, default: '', trim: true },
  source: { type: String, default: 'Manual Entry' },
  status: { type: String, default: 'New' },
  priority: { type: String, default: 'Medium' },
  deal_value: { type: Number, default: 0 },
  assigned_to: { type: String, default: 'Unassigned' },
  tags: { type: String, default: '' },
  notes: { type: String, default: '' },
  next_followup_date: { type: String, default: null }, // YYYY-MM-DD
  next_followup_time: { type: String, default: null }, // HH:mm
  custom_fields: { type: mongoose.Schema.Types.Mixed, default: {} }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual `id` to maintain compatibility with existing client code
leadSchema.virtual('id').get(function () {
  return this._id.toHexString();
});

// Activity Schema (Call logs, status changes, notes)
const activitySchema = new mongoose.Schema({
  lead_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', required: true },
  type: { type: String, default: 'note' }, // 'call', 'note', 'status_change', 'whatsapp', 'email', 'meeting'
  title: { type: String, required: true },
  details: { type: String, default: '' }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: false },
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

activitySchema.virtual('id').get(function () {
  return this._id.toHexString();
});

// Follow-up Schema
const followupSchema = new mongoose.Schema({
  lead_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', required: true },
  due_date: { type: String, required: true }, // YYYY-MM-DD
  due_time: { type: String, default: '10:00' },
  note: { type: String, default: '' },
  priority: { type: String, default: 'Medium' },
  is_completed: { type: Number, default: 0 }, // 0 or 1 for easy client compatibility
  completed_at: { type: Date, default: null }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: false },
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

followupSchema.virtual('id').get(function () {
  return this._id.toHexString();
});

// Settings Schema (Google Sheets URL, WhatsApp Templates, etc.)
const settingSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  value: { type: mongoose.Schema.Types.Mixed, required: true }
}, {
  timestamps: true
});

const Lead = mongoose.model('Lead', leadSchema);
const Activity = mongoose.model('Activity', activitySchema);
const Followup = mongoose.model('Followup', followupSchema);
const Setting = mongoose.model('Setting', settingSchema);

// Connect and seed default settings if needed
const connectDB = async (mongoUri) => {
  const uri = mongoUri || process.env.MONGODB_URI || "mongodb+srv://mis_db_user:Akash12345@cluster0.cmnpteg.mongodb.net/crm?retryWrites=true&w=majority&appName=Cluster0";
  
  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000
    });
    console.log('✅ Connected to MongoDB Atlas successfully!');

    // Initialize Default WhatsApp Templates if not present
    const existingTemplates = await Setting.findOne({ key: 'whatsapp_templates' });
    if (!existingTemplates) {
      await Setting.create({
        key: 'whatsapp_templates',
        value: [
          {
            id: '1',
            title: 'Introduction & Welcome',
            message: 'नमस्ते {name} जी! हमने आपकी इन्क्वायरी प्राप्त की है। क्या हम आपकी आवश्यकता के बारे में कुछ मिनट बात कर सकते हैं?'
          },
          {
            id: '2',
            title: 'Follow-up Call Reminder',
            message: 'Hello {name}, hope you are doing well! Following up on our previous discussion regarding your requirements. Let us know a good time to connect.'
          },
          {
            id: '3',
            title: 'Proposal Sent',
            message: 'Dear {name}, we have sent the detailed proposal to your email ({email}). Please review it and feel free to ask any questions.'
          },
          {
            id: '4',
            title: 'Special Offer / Discount',
            message: 'Hi {name}! We currently have an exclusive special offer on our services for this week. Would you be interested in a quick demo?'
          }
        ]
      });
    }

    // Check if leads collection is empty; if so, seed sample leads
    const leadCount = await Lead.countDocuments();
    if (leadCount === 0) {
      console.log('🌱 Seeding initial demo leads to MongoDB Atlas...');
      const sampleLeads = [
        {
          name: 'Rahul Sharma',
          phone: '+91 98765 43210',
          email: 'rahul.sharma@example.com',
          company: 'Sharma Infotech',
          city: 'Delhi',
          source: 'Website Form',
          status: 'In Progress',
          priority: 'High',
          deal_value: 45000,
          assigned_to: 'Amit Kumar',
          tags: 'VIP, Software, Hot',
          notes: 'Requested a demo for CRM integration. Very keen on automated follow-ups.',
          next_followup_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
          next_followup_time: '14:30'
        },
        {
          name: 'Priya Patel',
          phone: '+91 98234 56789',
          email: 'priya.patel@gujaratsteel.in',
          company: 'Gujarat Steel Corp',
          city: 'Ahmedabad',
          source: 'Google Ads',
          status: 'Proposal Sent',
          priority: 'Urgent',
          deal_value: 120000,
          assigned_to: 'Sneha Roy',
          tags: 'Enterprise, Proposal',
          notes: 'Sent enterprise quotation. Follow up on price negotiation this Friday.',
          next_followup_date: new Date().toISOString().split('T')[0],
          next_followup_time: '11:00'
        },
        {
          name: 'Vikram Singh',
          phone: '+91 97112 34567',
          email: 'vikram@singhlogistics.com',
          company: 'Singh Logistics & Freight',
          city: 'Jaipur',
          source: 'Referral',
          status: 'Won',
          priority: 'High',
          deal_value: 85000,
          assigned_to: 'Amit Kumar',
          tags: 'Converted, Annual Contract',
          notes: 'Deal closed! Advance payment received. Onboarding starting next Monday.',
          next_followup_date: null,
          next_followup_time: null
        }
      ];

      for (const item of sampleLeads) {
        const createdLead = await Lead.create(item);
        await Activity.create({
          lead_id: createdLead._id,
          type: 'note',
          title: 'Lead Created',
          details: 'Registered in MongoDB CRM'
        });

        if (item.next_followup_date) {
          await Followup.create({
            lead_id: createdLead._id,
            due_date: item.next_followup_date,
            due_time: item.next_followup_time || '11:00',
            note: 'Follow up with client regarding requirements',
            priority: item.priority
          });
        }
      }
      console.log('✅ Sample leads seeded successfully!');
    }
  } catch (err) {
    console.error('❌ MongoDB Connection Error:', err.message);
    throw err;
  }
};

module.exports = {
  connectDB,
  Lead,
  Activity,
  Followup,
  Setting
};
