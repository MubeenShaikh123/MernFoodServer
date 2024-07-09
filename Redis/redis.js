// const Redis = require('redis')
// const redisClient = Redis.createClient({
//     url: process.env.REDIS_URL
// });

// redisClient.on('error', (err) => {
//     console.error('Redis client error:', err);
// });

// redisClient.connect().then(() => {
//     console.log('Redis client connected');
// }).catch(err => {
//     console.error('Redis client connection error:', err);
// });

// const getorsetcache = (key, cb) => {
//     return new Promise((resolve, reject) => {
//         redisClient.get(key, async (error, data) => {
//             if (error) {
//                 console.log("error", error)
//                 return reject(error)
//             };
//             if (data != null) {
//                 console.log("cache hit")
//                 console.log("data", data)
//                 return resolve(JSON.parse(data))
//             };
//             console.log("cache miss")
//             const freshData = await cb();
//             redisClient.setEx(key, process.env.DEFAULT_EXP_FOR_REDIS, JSON.stringify(freshData))
//             console.log("freshdata ", freshData)

//             return resolve(freshData);
//         })
//     })
// }

// directly fetchingdata until redis is implemented
const getorsetcache = async (key, cb) => {
    try {
        // console.log(`Fetching data directly for key: ${key}`);
        const data = await cb();
        return data;
    } catch (error) {
        console.error('Error fetching data directly:', error);
        throw error;
    }
};

module.exports = getorsetcache