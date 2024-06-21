const Redis = require('redis')
const redisClient = Redis.createClient({
    url: process.env.REDIS_URL
});

redisClient.on('error', (err) => {
    console.error('Redis client error:', err);
});

redisClient.connect().then(() => {
    console.log('Redis client connected');
}).catch(err => {
    console.error('Redis client connection error:', err);
});

const getorsetcache = (key, cb) => {
    return new Promise((resolve, reject) => {
        redisClient.get(key, async (error, data) => {
            if (error) {
                console.log("error", error)
                return reject(error)
            };
            if (data != null) {
                console.log("cache hit")
                console.log("data", data)
                return resolve(JSON.parse(data))
            };
            console.log("cache miss")
            const freshData = await cb();
            redisClient.setEx(key, process.env.DEFAULT_EXP_FOR_REDIS, JSON.stringify(freshData))
            return resolve(freshData);
        })
    })
}

module.exports = getorsetcache