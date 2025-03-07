const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ecofarm', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('Connected to MongoDB successfully');
}).catch((err) => {
    console.error('MongoDB connection error:', err);
});

// User Schema
const userSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    password: String,
    searchHistory: [{
        previousCrop: String,
        soilType: String,
        region: String,
        farmSize: Number,
        recommendations: Object,
        timestamp: { type: Date, default: Date.now }
    }]
});

const User = mongoose.model('User', userSchema);

// Authentication Middleware
const authenticateToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Please login to access this feature' });

    jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
        if (err) return res.status(403).json({ error: 'Your session has expired. Please login again' });
        req.user = user;
        next();
    });
};

// Routes
app.post('/api/register', async (req, res) => {
    console.log('Received registration request:', req.body);
    try {
        const { name, email, password } = req.body;
        
        // Validate input
        if (!name || !email || !password) {
            console.log('Missing required fields');
            return res.status(400).json({ error: 'Please fill in all fields' });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            console.log('User already exists:', email);
            return res.status(400).json({ error: 'This email is already registered. Please login instead.' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create new user
        const user = new User({
            name,
            email,
            password: hashedPassword
        });

        await user.save();
        console.log('User registered successfully:', email);
        res.status(201).json({ message: 'Registration successful! Please login.' });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed. Please try again.' });
    }
});

app.post('/api/login', async (req, res) => {
    console.log('Received login request:', req.body.email);
    try {
        const { email, password } = req.body;
        
        // Validate input
        if (!email || !password) {
            console.log('Missing login credentials');
            return res.status(400).json({ error: 'Please fill in all fields' });
        }

        // Find user
        const user = await User.findOne({ email });
        if (!user) {
            console.log('User not found:', email);
            return res.status(400).json({ error: 'No account found with this email. Please register first.' });
        }

        // Check password
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            console.log('Invalid password for user:', email);
            return res.status(400).json({ error: 'Incorrect password. Please try again.' });
        }

        // Generate token
        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '24h' }
        );

        console.log('User logged in successfully:', email);
        res.json({ 
            token, 
            user: { 
                id: user._id,
                name: user.name,
                email: user.email
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed. Please try again.' });
    }
});

// Save search history
app.post('/api/save-search', authenticateToken, async (req, res) => {
    try {
        const { previousCrop, soilType, region, farmSize, recommendations } = req.body;
        
        // Validate the data
        if (!previousCrop || !soilType || !region || !farmSize || !recommendations) {
            console.log('Missing required search data');
            return res.status(400).json({ error: 'Missing required search data' });
        }

        // Update user's search history
        const updatedUser = await User.findByIdAndUpdate(
            req.user.userId,
            {
                $push: {
                    searchHistory: {
                        previousCrop,
                        soilType,
                        region,
                        farmSize,
                        recommendations,
                        timestamp: new Date()
                    }
                }
            },
            { new: true } // Return the updated document
        );

        if (!updatedUser) {
            console.log('User not found for search history update');
            return res.status(404).json({ error: 'User not found' });
        }

        console.log('Search history saved successfully for user:', updatedUser.email);
        res.json({ 
            message: 'Search history saved successfully',
            searchHistory: updatedUser.searchHistory
        });
    } catch (error) {
        console.error('Save search error:', error);
        res.status(500).json({ error: 'Failed to save search history' });
    }
});

// Get user's search history
app.get('/api/search-history', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        if (!user) {
            console.log('User not found for search history retrieval');
            return res.status(404).json({ error: 'User not found' });
        }

        // Sort search history by timestamp in descending order (newest first)
        const sortedHistory = user.searchHistory.sort((a, b) => 
            new Date(b.timestamp) - new Date(a.timestamp)
        );

        res.json(sortedHistory);
    } catch (error) {
        console.error('Get history error:', error);
        res.status(500).json({ error: 'Failed to load search history' });
    }
});

// Translation endpoint
app.post('/api/translate', async (req, res) => {
    try {
        const { text, target_language, to_english = false } = req.body;
        
        if (!text || !target_language) {
            return res.status(400).json({ error: 'Missing required parameters' });
        }

        // Add timeout to prevent hanging
        const timeoutMs = 30000; // 30 seconds timeout
        let timeoutId;

        // Execute the Python script with to_english parameter
        const { spawn } = require('child_process');
        const python = spawn('python', [
            'translator.py',
            text,
            target_language,
            to_english.toString()
        ]);

        let result = '';
        let error = '';

        // Set timeout
        const timeout = new Promise((resolve, reject) => {
            timeoutId = setTimeout(() => {
                python.kill();
                reject(new Error('Translation timed out'));
            }, timeoutMs);
        });

        // Create promise for translation process
        const translation = new Promise((resolve, reject) => {
            python.stdout.on('data', (data) => {
                result += data.toString();
            });

            python.stderr.on('data', (data) => {
                error += data.toString();
                console.error('Translation stderr:', data.toString());
            });

            python.on('close', (code) => {
                clearTimeout(timeoutId);
                if (code !== 0) {
                    console.error('Python script error:', error);
                    reject(new Error('Translation failed'));
                } else {
                    resolve(result);
                }
            });

            python.on('error', (err) => {
                clearTimeout(timeoutId);
                console.error('Python process error:', err);
                reject(err);
            });
        });

        // Wait for either timeout or translation completion
        const translationResult = await Promise.race([translation, timeout]);

        try {
            const parsedResult = JSON.parse(translationResult);
            if (parsedResult.success) {
                res.json({
                    translated_text: parsedResult.translated_text,
                    direction: parsedResult.direction
                });
            } else {
                res.status(500).json({ error: parsedResult.error });
            }
        } catch (e) {
            console.error('Error parsing translation result:', e);
            res.status(500).json({ error: 'Invalid translation result' });
        }

    } catch (error) {
        console.error('Translation error:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});

// Helper function to process recommendations with translations
async function processRecommendationsWithTranslation(recommendations, targetLanguage) {
    try {
        // First, ensure we have recommendations in English
        const englishRecommendations = recommendations;
        
        // Translate each part of the recommendations
        const translatedRecommendations = {};
        
        for (const [key, value] of Object.entries(englishRecommendations)) {
            if (typeof value === 'string') {
                // Translate string values
                const response = await fetch('/api/translate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        text: value,
                        target_language: targetLanguage
                    })
                });
                const result = await response.json();
                translatedRecommendations[key] = result.translated_text;
            } else if (Array.isArray(value)) {
                // Translate array values
                translatedRecommendations[key] = await Promise.all(
                    value.map(async (item) => {
                        const response = await fetch('/api/translate', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                text: typeof item === 'string' ? item : JSON.stringify(item),
                                target_language: targetLanguage
                            })
                        });
                        const result = await response.json();
                        return result.translated_text;
                    })
                );
            } else if (typeof value === 'object') {
                // Recursively translate nested objects
                translatedRecommendations[key] = await processRecommendationsWithTranslation(value, targetLanguage);
            } else {
                // Keep non-string values as is
                translatedRecommendations[key] = value;
            }
        }
        
        return translatedRecommendations;
    } catch (error) {
        console.error('Error processing translations:', error);
        return recommendations; // Return original if translation fails
    }
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));