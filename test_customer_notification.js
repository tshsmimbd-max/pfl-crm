// Test script to verify customer creation and notification functionality
import fs from 'fs';

// Test data for customer creation
const testCustomerData = {
  merchantCode: "TEST123",
  merchantName: "Test Company Ltd",
  rateChart: "ISD",
  contactPerson: "John Doe",
  phoneNumber: "01234567890",
  assignedAgent: "69e16f20-e742-4286-95d7-d4e5228603bc", // nafizuddin.nu@gmail.com
  productType: "E-commerce",
  notes: "Test customer for notification verification"
};

// Test data for bulk customer upload
const bulkCustomerCSV = `merchantCode,merchantName,rateChart,contactPerson,phoneNumber,assignedAgent,productType,notes
BULK001,Bulk Test Company 1,ISD,Jane Smith,01234567891,69e16f20-e742-4286-95d7-d4e5228603bc,Service,Bulk upload test 1
BULK002,Bulk Test Company 2,ISD,Bob Johnson,01234567892,55656041-9350-4c85-a1b1-10748e3d8135,E-commerce,Bulk upload test 2`;

// Write CSV file for bulk testing
fs.writeFileSync('test_bulk_customers.csv', bulkCustomerCSV);

console.log('Test data prepared:');
console.log('1. Single customer test data:', JSON.stringify(testCustomerData, null, 2));
console.log('2. Bulk CSV file created: test_bulk_customers.csv');
console.log('\nTo test notifications:');
console.log('1. Create single customer via POST /api/customers');
console.log('2. Upload bulk customers via POST /api/customers/bulk-upload');
console.log('3. Check notifications via GET /api/notifications');