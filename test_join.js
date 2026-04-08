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
        
        // POST /api/v1/categories/testcomm123/join
        const req2 = http.request({
            hostname: 'localhost',
            port: 8080,
            path: '/api/v1/categories/testcomm123/join',
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + token }
        }, (res2) => {
            let data2 = '';
            res2.on('data', chunk => data2 += chunk);
            res2.on('end', () => {
                console.log("Status:", res2.statusCode);
                console.log("Response:", data2);
            });
        });
        req2.end();
    });
});
req.write(JSON.stringify({ username: "admin", password: "password" }));
req.end();
