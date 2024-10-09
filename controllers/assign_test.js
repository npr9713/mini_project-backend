const pool = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    const token = authHeader.split(' ')[1];
    console.log(token);
    if (!token) {
        return res.status(200).json({ message: 'Unauthorized: No token provided' });
    }
    jwt.verify(token, process.env.JWT_ACCESS_TOKEN, (err, decoded) => {
        if (err) {
            return res.status(200).json({ message: 'Unauthorized: Invalid token' });
            
        }
        req.user = decoded;
        next();
    });
}
exports.getGroupsByOwner = async (req, res, next) => {
    try {

        verifyToken(req, res, async () => {
            const email = req.user.email;

          
            const query = `
                SELECT group_name
                FROM groups
                WHERE owner = $1;
            `;

     
            const result = await pool.query(query, [email]);

            if (result.rowCount === 0) {
                return res.status(404).json({ message: 'No groups found for this owner.' });
            }

            
            const groups = result.rows.map(group => group.group_name);

           
            return res.status(200).json({
                message: 'Groups retrieved successfully.',
                groups: groups 
            });
        });
    } catch (error) {
        console.error('Error retrieving groups:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};
exports.insertQuizQuestions = async (req, res,next) => {

    verifyToken(req, res, async () => {
        try {
            const { questions, group_name } = req.body; 

            const owner = req.user.email; 

            if (!Array.isArray(questions) || questions.length === 0) {
                return res.status(400).json({ message: 'Invalid input: questions must be a non-empty array.' });
            }

            const insertPromises = questions.map(async (questionData) => {
                const { question, answer, options, topic } = questionData;

                const insertQuery = `
                    INSERT INTO quiz_questions (question, answer, options, topic, owner, group_name) 
                    VALUES ($1, $2, $3, $4, $5, $6) 
                    RETURNING *;`;

                const result = await pool.query(insertQuery, [question, answer, JSON.stringify(options), topic, owner, group_name]);
                return result.rows[0]; 
            });

            const insertedQuestions = await Promise.all(insertPromises);
            console.log("quiz added")
            return res.status(200).json({
                message: 'Quiz questions added successfully.',
                questions: insertedQuestions
            });
        } catch (error) {
            console.error('Error inserting quiz questions:', error);
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    });
};
