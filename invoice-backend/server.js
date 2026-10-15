const express = require('express');
const oracledb = require('oracledb');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// Oracle Database Configuration using system user
const dbConfig = {
  user: 'system',
  password: 'Akshat',
  connectString: 'localhost:1521/XEPDB1'
};

// Initialize Database Table Automatically
async function initDb() {
  let connection;
  try {
    connection = await oracledb.getConnection(dbConfig);
    console.log('Connected to Oracle DB successfully!');
    
    // Ensure table exists
    await connection.execute(`
      BEGIN
        EXECUTE IMMEDIATE 'CREATE TABLE invoices (
          invoice_id NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
          client_name VARCHAR2(100) NOT NULL,
          invoice_date DATE DEFAULT SYSDATE,
          total_amount NUMBER(10, 2) NOT NULL
        )';
      EXCEPTION
        WHEN OTHERS THEN
          IF SQLCODE != -955 THEN
            RAISE;
          END IF;
      END;
    `);
    console.log('Database table "INVOICES" verified.');
  } catch (err) {
    console.error('Database Initialization Error:', err.message);
  } finally {
    if (connection) {
      await connection.close();
    }
  }
}

// POST Endpoint: Save New Invoice
app.post('/api/invoices', async (req, res) => {
  let connection;
  const { client_name, total_amount } = req.body;

  if (!client_name || !total_amount || isNaN(total_amount)) {
    return res.status(400).json({ success: false, error: 'Invalid input fields' });
  }

  try {
    connection = await oracledb.getConnection(dbConfig);
    const result = await connection.execute(
      `INSERT INTO invoices (client_name, total_amount) VALUES (:client_name, :total_amount)`,
      { client_name, total_amount },
      { autoCommit: true }
    );

    res.status(201).json({ success: true, message: 'Invoice saved successfully' });
  } catch (err) {
    console.error('Insert Error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    if (connection) {
      await connection.close();
    }
  }
});

// GET Endpoint: Fetch All Invoices
app.get('/api/invoices', async (req, res) => {
  let connection;
  try {
    connection = await oracledb.getConnection(dbConfig);
    const result = await connection.execute(
      `SELECT invoice_id, client_name, TO_CHAR(invoice_date, 'YYYY-MM-DD HH24:MI') as invoice_date, total_amount FROM invoices ORDER BY invoice_id DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Fetch Error:', err.message);
    res.status(500).json({ error: err.message });
  } finally {
    if (connection) {
      await connection.close();
    }
  }
});

const PORT = 3000;
app.listen(PORT, async () => {
  console.log(`Server running on http://localhost:${PORT}`);
  await initDb();
});