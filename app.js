const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const app = express();

// Middleware to parse JSON requests
app.use(bodyParser.json());

app.get('/', (req, res) => {
    res.send('Server is running!');
  });
  

// Queue and Stack classes to manage complaints
class Queue {
  constructor() {
    this.items = [];
  }
  enqueue(item) {
    this.items.push(item);
  }
  dequeue() {
    return this.items.shift();
  }
  isEmpty() {
    return this.items.length === 0;
  }
}

class Stack {
  constructor() {
    this.items = [];
  }
  push(item) {
    this.items.push(item);
  }
  pop() {
    return this.items.pop();
  }
  peek() {
    return this.items[this.items.length - 1];
  }
  isEmpty() {
    return this.items.length === 0;
  }
}

// Initialize queues and stacks
const complaintQueue = new Queue();
const resolvedComplaintsStack = new Stack();

// Function to assign priority based on complaint type
function assignPriority(complaint) {
  if (complaint.type === 'health hazard') return 1;
  if (complaint.type === 'missed pickup') return 2;
  return 3;
}

// Function to log resolved complaints to a CSV file
function logResolvedComplaint(complaint) {
  const log = `${complaint.id},${complaint.type},${complaint.priority},${complaint.dateResolved}\n`;
  fs.appendFileSync('resolved_complaints.csv', log, 'utf8');
}

// API endpoint to register a new complaint
app.post('/complaints', (req, res) => {
  try {
    const complaint = req.body;
    complaint.id = Date.now(); // Unique ID based on timestamp
    complaint.priority = assignPriority(complaint);
    complaintQueue.enqueue(complaint);
    res.status(201).json({ message: 'Complaint registered successfully', complaint });
  } catch (error) {
    res.status(500).json({ message: 'Error registering complaint' });
  }
});

// API endpoint to get active complaints with optional priority filtering
app.get('/complaints', (req, res) => {
  try {
    const priority = req.query.priority;
    const complaints = complaintQueue.items.filter(item => !priority || item.priority == priority);
    res.json({ complaints });
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving complaints' });
  }
});

// API endpoint to resolve a complaint
app.put('/complaints/:id/resolve', (req, res) => {
  try {
    const complaintId = parseInt(req.params.id);
    const complaintIndex = complaintQueue.items.findIndex(item => item.id === complaintId);

    if (complaintIndex === -1) return res.status(404).json({ message: 'Complaint not found' });

    const [resolvedComplaint] = complaintQueue.items.splice(complaintIndex, 1);
    resolvedComplaint.dateResolved = new Date().toISOString();
    resolvedComplaintsStack.push(resolvedComplaint);

    logResolvedComplaint(resolvedComplaint);

    res.json({ message: 'Complaint resolved', resolvedComplaint });
  } catch (error) {
    res.status(500).json({ message: 'Error resolving complaint' });
  }
});

// API endpoint to get the history of resolved complaints
app.get('/complaints/history', (req, res) => {
  try {
    res.json({ history: resolvedComplaintsStack.items });
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving complaint history' });
  }
});

// Function to generate daily logs for resolved complaints
function dailyLog() {
  const fileName = `logs/resolved_complaints_${new Date().toISOString().split('T')[0]}.csv`;
  fs.writeFileSync(fileName, 'ID,Type,Priority,DateResolved\n', 'utf8');
  resolvedComplaintsStack.items.forEach(complaint => {
    const log = `${complaint.id},${complaint.type},${complaint.priority},${complaint.dateResolved}\n`;
    fs.appendFileSync(fileName, log, 'utf8');
  });
  console.log(`Daily log created: ${fileName}`);
}

// Run the daily log function at midnight
setInterval(dailyLog, 24 * 60 * 60 * 1000);

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
