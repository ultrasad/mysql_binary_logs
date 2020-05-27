module.exports = {
    databases: {
		apidb: {
			host: process.env.MYSQL_API_HOST,
			user: process.env.MYSQL_API_USER,
			password: process.env.MYSQL_API_PWD,
			database: process.env.MYSQL_API_DB,
			dialect: 'mysql',
			timezone: '+07:00', //for writing to database
            port: 3306,
            charset : 'utf8_bin',
            connectionLimit: 100,
            queueLimit: 0,
            waitForConnection: true,
			dialectOptions: {
				connectTimeout: 3000
			},
			pool: {
				max: 10,
				min: 0,
				acquire: 30000,
				idle: 10000
			}
		},
		ccomdb: {
			host: process.env.MYSQL_CCOM_HOST,
			user: process.env.MYSQL_CCOM_USER,
			password: process.env.MYSQL_CCOM_PWD,
			database: process.env.MYSQL_CCOM_DB,
			dialect: 'mysql',
			timezone: '+07:00', //for writing to database
            port: 3306,
            charset : 'utf8_bin',
            connectionLimit: 100,
            queueLimit: 0,
            waitForConnection: true,
			dialectOptions: {
				connectTimeout: 3000
			},
			pool: {
				max: 10,
				min: 0,
				acquire: 30000,
				idle: 10000
			}
		}
	},
};