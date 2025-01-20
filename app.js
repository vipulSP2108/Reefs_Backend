// npx nodemon app
// npm run auto

const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const PORT = process.env.PORT || 5001;

const app = express();
app.use(cors());
app.use(express.json());

const jwtSecret = "aasjldjdspu29073ekjwhd2u8-u[uuwpiqwhdhuoy1028dhw";
const mongoUrl = "mongodb+srv://vipulpatil:Env8iGvpHqrHIs9o@cluster0.ocmzl.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

mongoose.connect(process.env.MONGO_URL || mongoUrl).then(() => {
    console.log("Database Connected");
}).catch((err) => {
    console.log("error", err);
});

require('./UseDetails');
const User = mongoose.model("UserInfo");
const ModelData = mongoose.model("ModelInfo");

// ----------------------------- start ----------------------------- //
app.get("/", async (req, res) => {
    res.send({ status: 'started' });
});

// ----------------------------- register ----------------------------- //
app.post("/register", async (req, res) => {
    const { name, contactinfo, password } = req.body;

    if (!name || !contactinfo || !password) {
        return res.status(400).send({ status: "error", data: "All fields are required" });
    }

    try {
        // Check if user with the same contactinfo and role already exists
        const oldUser = await User.findOne({ contactinfo: contactinfo });
        if (oldUser) {
            return res.status(400).send({ status: "error", data: "User with this contact info and role already exists" });
        }

        const encryptedPassword = await bcrypt.hash(password, 10);
        const user = new User({
            name: name,
            contactinfo: contactinfo,
            password: encryptedPassword,
        });

        await user.save();

        res.status(201).send({ status: "ok", data: "User Created" });

    } catch (err) {
        if (err.code === 11000) {
            return res.status(400).send({ status: "error", data: "Duplicate key error: contact info already exist" });
        }
        res.status(500).send({ status: "error", data: "Internal server error" });
    }
});

// ----------------------------- login ----------------------------- //
app.post("/login", async (req, res) => {
    const { contactinfo, password } = req.body;
    if (!contactinfo || !password) {
        return res.status(400).send({ status: "error", data: "Contact info, role and password are required" });
    }

    try {
        const oldUser = await User.findOne({ contactinfo: contactinfo });
        if (!oldUser) {
            return res.status(400).send({ status: "error", data: "User not exist" });
        }

        // if (oldUser.role !== role) {
        //     return res.status(400).send({ status: "error", data: 'Incorrect role. The appropriate role is ${oldUser.role}' });
        // }

        const isPasswordMatch = await bcrypt.compare(password, oldUser.password);
        if (isPasswordMatch) {
            const token = jwt.sign({ contactinfo: oldUser.contactinfo }, jwtSecret, { expiresIn: '365d' });
            res.status(200).send({ status: "ok", data: token });
        } else {
            res.status(400).send({ status: "error", data: "Invalid credentials" });
        }
    } catch (err) {
        console.log(err)
        res.status(500).send({ status: "error", data: "Internal server error" });
    }
});

// ----------------------------- user_getdata ----------------------------- //
app.post('/userdata', async (req, res) => {
    const { token } = req.body;
    try {
        const user = jwt.verify(token, jwtSecret, (err, res) => {
            if (err) {
                return 'token expired'
            }
            return res;
        });
        if (user == 'token expired') {
            return res.send({ status: "error", data: 'token expired' });
        }

        const usercontactinfo = user.contactinfo;
        User.findOne({ contactinfo: usercontactinfo }).then((data) => {
            return res.send({ status: "ok", data: data });
        })
    } catch (err) {
        res.status(500).send({ status: "error", data: "Internal server error" });
    }
})

// ----------------------------- add_model ----------------------------- //
app.post('/addmodel', async (req, res) => {
    try {
        // Extract data from the request body
        const { latitude, longitude, contactid, contactinfo, title, address, description, largeDescription,
            state, releaseDate,
            GeologicalAgesOptions,
            ClasticSedimentologyOptions,
            CarbonateAndEvaporiteSedimentologyOptions,
            MetamorphicOptions,
            ExtrusiveIgneousOptions,
            IntrusiveIgneousOptions,
            StructureOptions,
            FossilsOptions,
            QuaternaryGeomorphologyOptions,
            modelLink,
            author, license, tags, size, smallestVisibleFeature, contributors, citation, visibility } = req.body;

            console.log('req.body', req.body)

        // Ensure we structure the coordinates field correctly
        const coordinates = {
            latitude,
            longitude
        };

        // Find the current maximum index in the collection
        const lastRecord = await ModelData.findOne().sort({ index: -1 }).exec();

        // Determine the next index
        let nextIndex = 1; // Default to 1 if no records exist
        if (lastRecord && typeof lastRecord.index === 'number') {
            nextIndex = lastRecord.index + 1;
        }

        // Ensure nextIndex is a valid number
        if (isNaN(nextIndex) || nextIndex <= 0) {
            nextIndex = 1; // Reset to 1 if something went wrong
        }

        // Create the new record with the incremented index
        const newRecord = new ModelData({
            contactid,
            contactinfo,
            index: nextIndex, // Automatically set the next index
            title,
            address,
            coordinates,
            description,
            largeDescription,
            info: {
                state,
                releaseDate,
                modelLink,
                GeologicalAgesOptions,
                ClasticSedimentologyOptions,
                CarbonateAndEvaporiteSedimentologyOptions,
                MetamorphicOptions,
                ExtrusiveIgneousOptions,
                IntrusiveIgneousOptions,
                StructureOptions,
                FossilsOptions,
                QuaternaryGeomorphologyOptions,
                author,
                license,
                tags,
                size,
                smallestVisibleFeature,
            },
            contributors,
            citation,
            visibility,
        });

        // const requiredFields = [
        //     'latitude', 'longitude', 'contactid', 'contactinfo', 'title', 'address', 'description', 'largeDescription',
        //     'state', 'releaseDate', 
        //      'modelLink', 'author', 'license', 'tags', 
        //     'size', 'smallestVisibleFeature', 'contributors', 'citation', 'visibility'
        // ];

        // // Check if all required fields are present in the request body
        // for (let field of requiredFields) {
        //     if (!req.body[field]) {
        //         return res.status(400).json({
        //             status: "error",
        //             message: `Missing required field: ${field}`
        //         });
        //     }
        // }

        // Save the new record to the database
        await newRecord.save();

        // Return a success response
        res.status(201).json({ status: "ok", data: 'Record added successfully' });

    } catch (error) {
        console.error("Error adding record:", error);
        res.status(400).json({ status: "error", message: error.message, error: error.message });
    }
});


// ----------------------------- get_allModels ----------------------------- //
app.get('/getallmodels', async (req, res) => {
    try {
        const allModels = await ModelData.find();
        res.status(200).json({ status: "ok", data: allModels });
    } catch (error) {
        console.error("Error fetching all models:", error);
        res.status(400).json({ status: "error", message: 'Error fetching models', error: error.message });
    }
});


// ----------------------------- getUserModels ----------------------------- //
app.post('/getusermodels', async (req, res) => {
    const { token } = req.body;

    try {
        // Verify the token to ensure the user is authenticated
        const user = jwt.verify(token, jwtSecret, (err, decoded) => {
            if (err) {
                return 'token expired';
            }
            return decoded;
        });

        if (user === 'token expired') {
            return res.send({ status: "error", data: 'token expired' });
        }

        const usercontactinfo = user.contactinfo;  // Use contactid from decoded token

        // Fetch models associated with the specific user's contactid
        const userModels = await ModelData.find({ contactinfo: usercontactinfo });

        if (!userModels.length) {
            return res.status(404).json({ status: "error", message: "No models found for this user" });
        }

        res.status(200).json({ status: "ok", data: userModels });
    } catch (error) {
        console.error("Error fetching user models:", error);
        res.status(400).json({ status: "error", message: 'Error fetching user models', error: error.message });
    }
});


// ----------------------------- getmodel_pertcular ----------------------------- //
app.post('/getmodel', async (req, res) => {
    const { index } = req.body;

    // Input validation: ensure that index is provided
    if (!index) {
        return res.status(400).send({ status: "error", data: "Index is required" });
    }

    try {
        // Query MongoDB to find model data by the provided index
        const data = await ModelData.findOne({ index: index });

        // If data is not found, send a 404 response
        if (!data) {
            return res.status(404).send({ status: "error", data: "Model not found" });
        }

        // Return the model data if found
        return res.send({ status: "ok", data: data });
    } catch (err) {
        // Handle any errors during the database query
        console.error("Error fetching model:", err);
        return res.status(500).send({ status: "error", data: "Internal server error" });
    }
});




mongoose.set('autoIndex', true);

app.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
});