const Team = require('../models/Team');
const User = require('../models/User');

// @desc    Create new team
// @route   POST /api/v1/teams
// @access  Private
const createTeam = async (req, res) => {
  console.log('\n🔵 === CREAZIONE TEAM ===');
  console.log('📥 Dati ricevuti:', {
    name: req.body.name,
    description: req.body.description,
    createdBy: req.user.id
  });

  try {
    const { name, description, settings } = req.body;

    // Validation
    if (!name || name.trim().length < 2) {
      console.log('❌ Nome team non valido');
      return res.status(400).json({
        error: 'Team name must be at least 2 characters long'
      });
    }

    // Check if team name already exists
    const existingTeam = await Team.findOne({ name: name.trim() });
    if (existingTeam) {
      console.log('❌ Nome team già esistente:', name);
      return res.status(400).json({ error: 'Team name already exists' });
    }

    // Create team with invite code and explicit admin/member setup
    const team = new Team({
      name: name.trim(),
      description: description?.trim(),
      createdBy: req.user.id,
      adminIds: [req.user.id],    // ✅ Creatore come admin esplicito
      memberIds: [req.user.id],   // ✅ Creatore come membro esplicito
      settings: settings || {},
    });

    console.log('✅ Team creato con admin e membro espliciti:', req.user.id);

    // Generate unique invite code
    let codeExists = true;
    while (codeExists) {
      team.generateInviteCode();
      const existingCode = await Team.findOne({ inviteCode: team.inviteCode });
      codeExists = !!existingCode;
    }

    await team.save();

    // Update user's teamIds
    await User.findByIdAndUpdate(req.user.id, {
      $addToSet: { teamIds: team._id }
    });

    console.log('✅ Team creato:', team.name, 'Codice:', team.inviteCode);
    console.log('🔵 === FINE CREAZIONE TEAM ===\n');

    res.status(201).json({
      success: true,
      team: {
        id: team._id,
        name: team.name,
        description: team.description,
        inviteCode: team.inviteCode,
        createdBy: team.createdBy,
        totalMembers: team.totalMembers,
        settings: team.settings,
        stats: team.stats,
        colors: team.colors
      }
    });

  } catch (error) {
    console.log('❌ ERRORE CREAZIONE TEAM:', error.message);
    console.log('🔵 === FINE CREAZIONE TEAM (ERRORE) ===\n');
    res.status(500).json({ error: 'Server error during team creation' });
  }
};

// @desc    Get all public teams
// @route   GET /api/v1/teams
// @access  Public
const getAllTeams = async (req, res) => {
  console.log('\n🌍 === GET ALL PUBLIC TEAMS ===');

  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';

    // Build query for public teams only
    const query = {
      'settings.isPrivate': { $ne: true }, // Non privati (inclusi undefined)
      isActive: true
    };

    // Add search filter if provided
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    const teams = await Team.find(query)
      .select('name description totalMembers stats colors createdAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalTeams = await Team.countDocuments(query);

    console.log('✅ Team pubblici trovati:', teams.length);
    console.log('🌍 === FINE GET ALL PUBLIC TEAMS ===\n');

    res.json({
      success: true,
      teams: teams.map(team => ({
        id: team._id,
        name: team.name,
        description: team.description,
        totalMembers: team.totalMembers,
        stats: team.stats,
        colors: team.colors,
        createdAt: team.createdAt
      })),
      pagination: {
        page,
        limit,
        total: totalTeams,
        pages: Math.ceil(totalTeams / limit)
      }
    });

  } catch (error) {
    console.log('❌ ERRORE GET ALL TEAMS:', error.message);
    console.log('🌍 === FINE GET ALL TEAMS (ERRORE) ===\n');
    res.status(500).json({ error: 'Server error fetching teams' });
  }
};

// @desc    Get team details
// @route   GET /api/v1/teams/:id
// @access  Private
const getTeam = async (req, res) => {
  console.log('\n🟢 === GET TEAM INFO ===');
  console.log('📥 Team ID:', req.params.id);

  try {
    const team = await Team.findById(req.params.id)
      .populate('memberIds', 'name email birthdate profile.position stats teamName')
      .populate('adminIds', 'name email birthdate teamName')
      .populate('createdBy', 'name email birthdate teamName');

    if (!team) {
      console.log('❌ Team non trovato');
      return res.status(404).json({ error: 'Team not found' });
    }

    // Check if user is member or team is public
    const isMember = team.isMember(req.user.id);
    const isPublic = !team.settings.isPrivate;

    if (!isMember && !isPublic) {
      console.log('❌ Accesso negato - team privato');
      return res.status(403).json({ error: 'Access denied - private team' });
    }

    console.log('✅ Team info recuperate per:', team.name);
    console.log('🟢 === FINE GET TEAM INFO ===\n');

    res.json({
      success: true,
      team: {
        id: team._id,
        name: team.name,
        description: team.description,
        inviteCode: isMember ? team.inviteCode : undefined, // Solo membri vedono il codice
        createdBy: team.createdBy,
        memberIds: team.memberIds,
        adminIds: team.adminIds,
        totalMembers: team.totalMembers,
        isFull: team.isFull,
        settings: team.settings,
        stats: team.stats,
        colors: team.colors,
        isUserMember: isMember,
        isUserAdmin: team.isAdmin(req.user.id)
      }
    });

  } catch (error) {
    console.log('❌ ERRORE GET TEAM:', error.message);
    console.log('🟢 === FINE GET TEAM (ERRORE) ===\n');
    res.status(500).json({ error: 'Server error fetching team' });
  }
};

// @desc    Join team with invite code
// @route   POST /api/v1/teams/join
// @access  Private
const joinTeam = async (req, res) => {
  console.log('\n🟡 === JOIN TEAM ===');
  console.log('📥 Codice invito:', req.body.inviteCode);
  console.log('📥 User ID:', req.user.id);

  try {
    const { inviteCode } = req.body;

    if (!inviteCode) {
      console.log('❌ Codice invito mancante');
      return res.status(400).json({ error: 'Invite code is required' });
    }

    // Find team by invite code
    const team = await Team.findOne({ inviteCode: inviteCode.toUpperCase() });
    if (!team) {
      console.log('❌ Codice invito non valido:', inviteCode);
      return res.status(404).json({ error: 'Invalid invite code' });
    }

    // Check if user is already a member
    if (team.isMember(req.user.id)) {
      console.log('❌ Utente già membro del team');
      return res.status(400).json({ error: 'You are already a member of this team' });
    }

    // Check if team is full
    if (team.isFull) {
      console.log('❌ Team pieno');
      return res.status(400).json({ error: 'Team has reached maximum members limit' });
    }

    // Add user to team
    team.addMember(req.user.id);
    await team.save();

    // Update user's teamIds
    await User.findByIdAndUpdate(req.user.id, {
      $addToSet: { teamIds: team._id }
    });

    console.log('✅ Utente aggiunto al team:', team.name);
    console.log('🟡 === FINE JOIN TEAM ===\n');

    res.json({
      success: true,
      message: `Successfully joined ${team.name}`,
      team: {
        id: team._id,
        name: team.name,
        description: team.description,
        totalMembers: team.totalMembers + 1 // Aggiornato
      }
    });

  } catch (error) {
    console.log('❌ ERRORE JOIN TEAM:', error.message);
    console.log('🟡 === FINE JOIN TEAM (ERRORE) ===\n');
    res.status(500).json({ error: 'Server error joining team' });
  }
};

// @desc    Get user's teams
// @route   GET /api/v1/teams/my-teams
// @access  Private
const getMyTeams = async (req, res) => {
  console.log('\n🟣 === GET MY TEAMS ===');
  console.log('📥 User ID:', req.user.id);

  try {
    const user = await User.findById(req.user.id).populate('teamIds', 'name description totalMembers stats colors');

    console.log('✅ Teams trovati:', user.teamIds.length);
    console.log('🟣 === FINE GET MY TEAMS ===\n');

    res.json({
      success: true,
      teams: user.teamIds.map(team => ({
        id: team._id,
        name: team.name,
        description: team.description,
        totalMembers: team.totalMembers,
        stats: team.stats,
        colors: team.colors
      }))
    });

  } catch (error) {
    console.log('❌ ERRORE GET MY TEAMS:', error.message);
    console.log('🟣 === FINE GET MY TEAMS (ERRORE) ===\n');
    res.status(500).json({ error: 'Server error fetching teams' });
  }
};

// @desc    Leave team
// @route   DELETE /api/v1/teams/:id/leave
// @access  Private
const leaveTeam = async (req, res) => {
  console.log('\n🔴 === LEAVE TEAM ===');
  console.log('📥 Team ID:', req.params.id);
  console.log('📥 User ID:', req.user.id);

  try {
    const team = await Team.findById(req.params.id);
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    // Check if user is member
    if (!team.isMember(req.user.id)) {
      return res.status(400).json({ error: 'You are not a member of this team' });
    }

    // Check if user is the creator and only member
    if (team.createdBy.equals(req.user.id) && team.totalMembers === 1) {
      // Delete the team
      await Team.findByIdAndDelete(team._id);
      console.log('🗑️ Team eliminato (ultimo membro)');
    } else if (team.createdBy.equals(req.user.id)) {
      // Transfer ownership to first admin or member
      const newOwner = team.adminIds.find(id => !id.equals(req.user.id)) ||
        team.memberIds.find(id => !id.equals(req.user.id));

      if (newOwner) {
        team.createdBy = newOwner;
        if (!team.isAdmin(newOwner)) {
          team.adminIds.push(newOwner);
        }
      }

      team.removeMember(req.user.id);
      await team.save();
      console.log('👑 Proprietà trasferita e utente rimosso');
    } else {
      // Just remove user
      team.removeMember(req.user.id);
      await team.save();
      console.log('👋 Utente rimosso dal team');
    }

    // Update user's teamIds
    await User.findByIdAndUpdate(req.user.id, {
      $pull: { teamIds: team._id }
    });

    console.log('✅ Leave team completato');
    console.log('🔴 === FINE LEAVE TEAM ===\n');

    res.json({
      success: true,
      message: 'Successfully left the team'
    });

  } catch (error) {
    console.log('❌ ERRORE LEAVE TEAM:', error.message);
    console.log('🔴 === FINE LEAVE TEAM (ERRORE) ===\n');
    res.status(500).json({ error: 'Server error leaving team' });
  }
};

module.exports = {
  getAllTeams,
  createTeam,
  getTeam,
  joinTeam,
  getMyTeams,
  leaveTeam
};