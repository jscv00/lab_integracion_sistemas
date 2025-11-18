const express = require('express');
const cors = require('cors');
const plantsRoutes = require('./routes/plants.js');
const plantActivitiesRoutes = require('./routes/plantActivities.js');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/plants', plantsRoutes);
app.use('/plant_activities', plantActivitiesRoutes);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 