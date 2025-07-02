import runMigrations from './migrate.js';
import app from './app.js';

// runMigrations().then(() => {
  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
// }); 