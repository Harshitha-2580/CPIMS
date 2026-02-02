// Test the API endpoint to verify it works
const http = require('http');

// Test with string ID (NECN_FAC_010)
const testUrl = 'http://localhost:3000/api/faculty/profile/NECN_FAC_010';

console.log('Testing API endpoint: ' + testUrl);

http.get(testUrl, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
        data += chunk;
    });
    
    res.on('end', () => {
        console.log('Response status:', res.statusCode);
        console.log('Response body:', data);
        try {
            const json = JSON.parse(data);
            console.log('Parsed response:', json);
            if (json.success && json.faculty) {
                console.log('\n✅ SUCCESS! Faculty data:');
                console.log('  Name:', json.faculty.name);
                console.log('  Phone:', json.faculty.phone);
                console.log('  Designation:', json.faculty.designation);
                console.log('  Department:', json.faculty.department);
            } else {
                console.log('\n❌ FAILED:', json.message);
            }
        } catch (e) {
            console.error('Failed to parse JSON:', e.message);
        }
    });
}).on('error', (err) => {
    console.error('Error:', err.message);
    console.log('\n⚠️  Make sure the backend server is running on port 3000');
});
