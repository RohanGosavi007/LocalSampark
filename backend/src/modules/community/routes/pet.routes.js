const express = require('express');
const router = express.Router();
const { query, queryOne } = require('../../../../config/database');
const { authenticate } = require('../../../../middleware/auth.middleware');

router.get('/', authenticate, async (req, res, next) => {
  try {
    const pets = await query('SELECT * FROM pets WHERE owner_id = $1', [req.user.id]);
    res.json(pets);
  } catch (error) {
    next(error);
  }
});

router.post('/', authenticate, async (req, res, next) => {
  try {
    const { name, species, breed, ageYears, gender, photoUrl } = req.body;
    const pet = await queryOne(
      `INSERT INTO pets (owner_id, name, species, breed, age_years, gender, photo_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [req.user.id, name, species, breed, ageYears, gender, photoUrl]
    );
    res.status(201).json(pet);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
