const express = require('express');
const app = express();
require('dotenv').config()
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');

const port = 8000;

// middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.aezqr.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // All collection
        const db = client.db('mediBazaar')
        const userCollection = db.collection('users')
        const advertiseCollection = db.collection('advertisements')
        const categoryCollection = db.collection('categories')
        const medicineCollection = db.collection('medicines')
        const cartCollection = db.collection('carts')

        // JWT api
        app.post('/jwt', async (req, res) => {
            const user = req.body;
            const token = jwt.sign({ user }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
            res.send({ token });
        })

        //verify token middlewares
        const verifyToken = (req, res, next) => {
            const token = req.headers.authorization?.split(" ")[1];
            // console.log('i am token', token);

            if (!token) {
                return res.status(401).send({ message: "Unauthorized: No token provided" })
            }
            jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
                if (err) {
                    return res.status(403).send({ message: "Unauthorized: Invalid token" })
                }
                req.user = decoded;
                next();
            });
        };

        // Storing user to DB
        app.post('/users', async (req, res) => {
            const user = req.body;
            const email = user.email;

            // checking if user already exists
            const isExist = await userCollection.findOne({ email })
            if (isExist) {
                return res.send('Exists this user')
            }

            // Adding new user to db
            const newUser = { ...user, createdAt: Date.now() };
            const result = await userCollection.insertOne(newUser)
            return res.send(result);
        })

        // Get a user info by email from db
        app.get('/user/:email', verifyToken, async (req, res) => {
            const email = req.params.email
            const result = await userCollection.findOne({ email })
            res.send(result)
        })

        // Get all users data form db
        app.get('/users', verifyToken, async (req, res) => {
            const result = await userCollection.find().toArray()
            res.send(result)
        })

        // Updating user role
        app.patch('/users/:email', verifyToken, async (req, res) => {
            const email = req.params.email;
            const { role } = req.body;
            // console.log('Updating user role', email, role);
            const filter = { email: email };
            const updatedDoc = {
                $set: {
                    role: role
                }
            }
            const result = await userCollection.updateOne(filter, updatedDoc)
            res.send(result)
        })

        // Get all advertised medicines
        app.get('/advertised-medicines', async (req, res) => {
            const result = await advertiseCollection.find().toArray();
            return res.send(result)
        })

        // Getting seller specific medicine name
        app.get('/sellerMedicine/:email', async (req, res) => {
            const email = req.params.email
            console.log('sellerMedicine hti', email);
            // const result = await medicineCollection.find({ sellerEmail: email }, { name: 1 }).toArray()
            const result = await medicineCollection.find({ sellerEmail: email }, { projection: { name: 1 } }).toArray()
            res.send(result)

        })

        // Adding Advertisements
        app.post('/advertisements', async (req, res) => {
            const data = req.body;
            console.log('advertisements data', data);
            const newAdd = {
                ...data,
                createdAt: Date.now()
            }
            const result = await advertiseCollection.insertOne(newAdd)
            res.send(result);
        })

        // Adding Category
        app.post('/categories', verifyToken, async (req, res) => {
            const category = req.body;

            const categoryName = category.categoryName.trim().toLowerCase();
            console.log('categoryName', categoryName);

            // checking if user already exists
            const isExist = await categoryCollection.findOne({ categoryName: { $regex: categoryName, $options: 'i' } })
            console.log('isExist', isExist);

            if (isExist) {
                return res.send({ message: 'This category name already exists!' })
            }

            const newCategory = { ...category, createdAt: Date.now() }
            // console.log('category', category);

            const result = await categoryCollection.insertOne(newCategory);
            res.send(result)
        })

        // Get All Categories
        app.get('/categories', async (req, res) => {
            try {
                // Fetch all categories from categoryCollection (excluding the hardcoded medicineCount)
                const categories = await categoryCollection.find().toArray();

                // Fetch medicine counts grouped by category from medicineCollection
                const medicineCounts = await medicineCollection.aggregate([
                    {
                        $group: {
                            _id: "$category", // Group by category name
                            medicineCount: { $sum: 1 } // Count medicines in each category
                        }
                    }
                ]).toArray();

                // Create a mapping of category names to actual medicine count
                const medicineCountMap = {};

                medicineCounts.forEach(({ _id, medicineCount }) => {
                    medicineCountMap[_id] = medicineCount;
                });

                // Merge actual medicine count into category data
                const enrichedCategories = categories.map(category => ({
                    ...category,
                    medicineCount: medicineCountMap[category.categoryName] || 0 // Default 0 if no medicines
                }));

                return res.send(enrichedCategories)
                // res.json(enrichedCategories);

            } catch (error) {
                console.error("Error fetching categories with medicine count:", error);
                res.status(500).json({ error: "Internal Server Error" });
            }
        })

        // Delete Category
        app.delete('/categories/:id', verifyToken, async (req, res) => {
            try {
                const id = req.params.id
                // console.log('new id', id);
                const query = { _id: new ObjectId(id) }
                const result = await categoryCollection.deleteOne(query)
                res.send(result)
            } catch (err) {
                console.log("Error deleting the category:", err);
            }
        })

        // Updating Category
        app.put('/categories/:id', verifyToken, async (req, res) => {
            const id = req.params.id
            const data = req.body;
            console.log('update data and id', id, data);
            const query = { _id: new ObjectId(id) }
            try {
                const category = await categoryCollection.findOne(query)
                // console.log('category', category);

                if (!category) {
                    return res.send({ message: 'Category not found' })
                }
                const result = await categoryCollection.updateOne(query, {
                    $set: {
                        ...data,
                        updatedAt: Date.now()
                    }
                })
                res.send(result);
            } catch (err) {
                console.log(err);
            }
        })

        // Get Discounted Products (Filtered)
        app.get('/discount-medicines', async (req, res) => {
            const discountedMedicines = await medicineCollection.find({ discount: { $gt: 0 } }).toArray();

            // Calculating discounted medicine
            const CalculatedMedicines = discountedMedicines.map((medicine) => {
                const discountAmount = (medicine.price * medicine.discount) / 100;
                const discountPrice = parseFloat((medicine.price - discountAmount).toFixed(2))

                return {
                    medicineName: medicine.name,
                    medicineImage: medicine.image,
                    originalPrice: medicine.price,
                    discountPrice: discountPrice,
                    discountPercentage: medicine.discount
                }
            })

            res.send(CalculatedMedicines)
        })

        // Get all Medicines
        app.get('/medicines', async (req, res) => {
            let { page = 1, limit = 6, sortBy, category, search } = req.query;

            // Making all are number
            page = Number(page);
            limit = Number(limit);

            const query = {};

            // Category
            if (category && category !== 'All Categories') query.category = category;

            //Search
            if (search) {
                query.$or = [
                    { name: { $regex: search, $options: 'i' } },
                    { genericName: { $regex: search, $options: 'i' } },
                    { company: { $regex: search, $options: 'i' } },
                ]
            }

            //Sorting
            const sortOptions = {};
            if (sortBy === 'priceLow') sortOptions.price = 1;
            if (sortBy === 'priceHigh') sortOptions.price = -1;

            //Getting all filtered and pagination medicines
            const medicines = await medicineCollection
                .find(query)
                .sort(sortOptions)
                .limit(limit)
                .skip((page - 1) * limit)
                .toArray();

            //Counting total for pagination
            const total = await medicineCollection.countDocuments(query);

            res.send({
                data: medicines,
                totalPages: Math.ceil(total / limit),
            });
        })

        // Get all Category based Medicines
        app.get('/medicines/category/:categoryName', async (req, res) => {
            try {
                let { categoryName } = req.params;
                const { sortBy, search } = req.query;
                const query = { category: categoryName };
                if (search) {
                    query.$or = [
                        { name: { $regex: search, $options: 'i' } },
                        { genericName: { $regex: search, $options: 'i' } },
                        { company: { $regex: search, $options: 'i' } },
                    ];
                }
                const sortOptions = {
                    priceLow: { price: 1 },
                    priceHigh: { price: -1 },
                }[sortBy] || {}

                // console.log('query', query, search, sortBy, sortOptions);
                const medicines = await medicineCollection.find(query).sort(sortOptions).toArray();
                res.send(medicines)
            } catch (err) {
                console.log(err);
            }
        })

        // Adding medicine to cart
        app.post('/cart', verifyToken, async (req, res) => {
            // console.log('yes i am successfully hitted');

            const { email, medicineId, name, image, price, discount, quantity } = req.body;
            const finalPrice = price - (price * (discount / 100));
            const existingCart = await cartCollection.findOne({ email })

            if (existingCart) {
                const itemIndex = existingCart.items.findIndex(item => item.medicineId === medicineId);
                if (itemIndex > -1) {
                    existingCart.items[itemIndex].quantity += quantity; //increase its quantity
                } else {
                    existingCart.items.push({ medicineId, name, image, price, discount, finalPrice, quantity })
                }
                await cartCollection.updateOne(
                    { email },
                    { $set: { items: existingCart.items, updatedAt: new Date() } });
                return res.send({ message: "Cart updated successfully" })
            } else {
                const newCart = {
                    email,
                    items: [{ medicineId, name, image, price, discount, finalPrice, quantity }],
                    createdAt: new Date(),
                    updatedAt: new Date()
                };
                await cartCollection.insertOne(newCart);
                return res.send({ message: "Cart created successfully" })
            }
        })

        // Get Cart Items for a User
        app.get('/cart/:email', verifyToken, async (req, res) => {
            const { email } = req.params;
            console.log('yes hitted', email);

            const cart = await cartCollection.findOne({ email });
            if (!cart) return res.send({ items: [], totalPrice: 0 });
            const totalPrice = cart.items.reduce((sum, item) => sum + (item.finalPrice * item.quantity), 0);
            const totalQuantity = cart.items.reduce((sum, item) => sum + item.quantity, 0)
            // console.log('totalQuantity', totalQuantity);

            res.send({ items: cart.items, totalPrice, totalQuantity });
        })

        //Update Cart Item quantity
        app.patch('/cart/:email', verifyToken, async (req, res) => {
            const { email } = req.params;
            const { medicineId, quantity } = req.body;
            // console.log('from patch cart', email, medicineId, quantity);


            const cart = await cartCollection.findOne({ email });
            if (!cart) return res.send({ message: "Cart not found" })

            const itemIndex = cart.items.findIndex(item => item.medicineId === medicineId);
            if (itemIndex > -1) {
                // console.log(cart.items[itemIndex].quantity);
                cart.items[itemIndex].quantity = quantity;
            } else {
                return res.send({ message: "Item not found in cart" })
            }
            await cartCollection.updateOne({ email }, {
                $set: {
                    items: cart.items,
                    updatedAt: new Date()
                }
            })
            res.send({ message: "Cart item updated successfully" })
        })

        // Remove an Item from Cart
        app.delete('/cart/:email/:medicineId', verifyToken, async (req, res) => {
            try {
                const { email, medicineId } = req.params;
                const result = await cartCollection.updateOne({ email }, { $pull: { items: { medicineId } } });
                res.send(result)
            }
            catch (err) {
                console.log(err);
            }
        })

        // Clear Entire Cart
        app.delete('/cart/:email', verifyToken, async (req, res) => {
            try {
                const { email } = req.params;

                const result = await cartCollection.deleteOne({ email });
                res.send(result)
            } catch (err) {
                console.log("Error clearing cart:", err);
            }
        })
        // await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // await client.close();
    }
}

run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('done')
})

app.listen(port, () => {
    console.log(`app listing on ports ${port}`);
})