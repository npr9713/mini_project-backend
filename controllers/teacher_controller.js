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

function generateInstructorId(name, email) {
    const base = name + email;
    const hash = base.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return (Math.random().toString(36) + hash.toString(36)).substr(2, 6);
}

exports.sign_up = async (req, res, next) => {
    const { name, email, password } = req.body;

    try {
        
        const existingInstructor = await pool.query('SELECT * FROM instructors WHERE email = $1', [email]);
        if (existingInstructor.rows.length > 0) {
            return res.status(400).json({ message: 'Email already registered.',success:"-1" });
        }

        const instructorId = generateInstructorId(name, email);

        const hashedPassword = await bcrypt.hash(password, 10);

        const query = `
            INSERT INTO instructors (instructor_id,name, email, password)
            VALUES ($1, $2, $3, $4);
        `;

        const result = await pool.query(query, [instructorId,name, email, hashedPassword]);

        return res.status(200).json({
            message: 'Instructor registered successfully',
            data: result.rows[0],
            success:"1"
        });

    } catch (error) {
        console.error('Error registering instructor:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.login = async (req, res, next) => {
    try {
        const { email, password } = req.body; 

        const emailQuery = "SELECT * FROM instructors WHERE email = $1";
        const user = await pool.query(emailQuery, [email]);

        if (user.rowCount === 0) {
            return res.status(400).json({ message: 'Email not found' });
        }

        const hashedPasswordFromDB = user.rows[0].password; 

        try {
            
            const passwordMatch = await bcrypt.compare(password, hashedPasswordFromDB);

            if (passwordMatch) {
               
                const token = jwt.sign({ email: user.rows[0].email }, process.env.JWT_ACCESS_TOKEN, { expiresIn: '30d' });
                return res.status(200).json({ message: 'Login successful', token,success:"1" });
            } else {
               
                return res.status(400).json({ message: 'Invalid password',success:"-1" });
            }
        } catch (bcryptError) {
            console.error('Error comparing passwords with Bcrypt:', bcryptError);
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    } catch (error) {
        console.error('Error in login:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};
exports.addGroup = async (req, res,next) => {
    try {
        verifyToken(req,res,async()=>{
        const { group_name, users } = req.body; 
        const email =req.user.email;
        if (!group_name || !Array.isArray(users)) {
            return res.status(400).json({ message: 'Invalid input: group_name must be a string and users must be an array.' });
        }
        const insertQuery = `
            INSERT INTO groups (group_name, users,owner) 
            VALUES ($1, $2,$3) 
            RETURNING *`; 

        const result = await pool.query(insertQuery, [group_name, JSON.stringify(users),email]);
        
        return res.status(200).json({
            message: 'Group added successfully',
            group: result.rows[0] 
        });
        })
        
    } catch (error) {
        console.error('Error adding group:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};