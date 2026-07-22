const crypto = require('crypto');

// In-memory databases for demonstration purposes
const ngos = [
  { id: 1, name: 'Asha AnathAshram', type: 'Orphanage', requirements: ['Winter Clothes', 'Rice', 'Stationery'] },
  { id: 2, name: 'Shanti Old Age Home', type: 'Old Age Home', requirements: ['Medicines', 'Blankets', 'Funds'] },
  { id: 3, name: 'Paws Rescue', type: 'Animal Shelter', requirements: ['Dog Food', 'Old Towels'] }
];

const crowdfundingProjects = [
  { id: 1, title: 'Medical Treatment for Raju Guard', description: 'Raju needs appendix surgery.', goal: 50000, raised: 15500, type: 'Medical' },
  { id: 2, title: 'CCTV for Block B', description: 'Installing 4 new HD cameras for security.', goal: 12000, raised: 12000, type: 'Community' }
];

const foodRescues = [];
let deliverySubsidized = false;
let surpriseBonusAmount = 50;

exports.getNGOs = async (req, res) => {
  res.status(200).json({ success: true, data: ngos });
};

exports.getCrowdfunding = async (req, res) => {
  res.status(200).json({ success: true, data: crowdfundingProjects });
};

exports.createCrowdfund = async (req, res) => {
  const { title, description, goal, type } = req.body;
  const newProject = {
    id: crowdfundingProjects.length + 1,
    title,
    description,
    goal: parseInt(goal, 10),
    raised: 0,
    type
  };
  crowdfundingProjects.push(newProject);
  res.status(201).json({ success: true, message: 'Crowdfund created successfully.', data: newProject });
};

exports.donateToCrowdfund = async (req, res) => {
  const { id } = req.params;
  const { amount } = req.body;
  const project = crowdfundingProjects.find(p => p.id == id);
  if (!project) return res.status(404).json({ success: false, error: 'Project not found' });
  
  project.raised += parseInt(amount, 10);
  
  let msg = `Successfully donated ₹${amount}.`;
  if (surpriseBonusAmount > 0) {
    msg += ` You received a Surprise Bonus of ${surpriseBonusAmount} Coins from the Admin!`;
  }

  res.status(200).json({ success: true, message: msg, project });
};

exports.postFoodRescue = async (req, res) => {
  const { itemName, quantity, address, type } = req.body; // type: 'Food' or 'Item'
  const newRescue = {
    id: crypto.randomUUID(),
    itemName,
    quantity,
    address,
    type,
    status: 'pending_pickup',
    timestamp: new Date()
  };
  foodRescues.push(newRescue);

  // Broadcast to Delivery Agents (Supabase Realtime)
  const supabaseRealtime = req.app.get('supabaseRealtime');
  if (supabaseRealtime) {
    supabaseRealtime.broadcast('global', 'donation:rescue:new', newRescue);
  }

  const deliveryFee = deliverySubsidized ? 0 : 20;
  let msg = `${type} Donation Alert Broadcasted to Delivery Agents!`;
  if (deliveryFee > 0) msg += ` Delivery Fee of ₹${deliveryFee} will be charged.`;
  else msg += ` Delivery Fee is fully SUBSIDIZED by Charity!`;

  res.status(201).json({ success: true, message: msg, data: newRescue });
};

exports.getFoodRescues = async (req, res) => {
  res.status(200).json({ success: true, data: foodRescues });
};

exports.getAdminConfig = async (req, res) => {
  res.status(200).json({ 
    success: true, 
    data: { deliverySubsidized, surpriseBonusAmount } 
  });
};

exports.updateAdminConfig = async (req, res) => {
  const { subsidized, bonus } = req.body;
  if (subsidized !== undefined) deliverySubsidized = subsidized;
  if (bonus !== undefined) surpriseBonusAmount = parseInt(bonus, 10);
  
  res.status(200).json({ 
    success: true, 
    message: 'Admin settings updated successfully.',
    data: { deliverySubsidized, surpriseBonusAmount }
  });
};
