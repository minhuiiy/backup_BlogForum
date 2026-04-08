const http = require('http');

const reqOptions = {
    hostname: 'localhost',
    port: 8080,
    path: '/api/v1/auth/signin',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
};

const req = http.request(reqOptions, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        const token = JSON.parse(data).token;
        console.log("Got token!", token.substring(0, 20) + "...");
        
        // GET /api/v1/users/search?q=a
        http.get('http://localhost:8080/api/v1/users/search?q=a', {
            headers: { 'Authorization': 'Bearer ' + token }
        }, (res2) => {
            let data2 = '';
            res2.on('data', chunk => data2 += chunk);
            res2.on('end', () => {
                console.log("Status:", res2.statusCode);
                console.log(data2);
            });
        });
    });
});
req.write(JSON.stringify({ username: "admin", password: "123456" }));
req.end();
