const router = require('express').Router();
const httpRequest = require('request-promise-native');
const generatePassword = require('../../utils/generatePassword');

const newSignSchema = require('../../schema/signupSchema');

const Validator = require('jsonschema').Validator;
const validator = new Validator();

module.exports = (db) => {

    const userDb = require('../../db/user')(db);
    const participantDb = require('../../db/participant')(db);


    //POST /signup
    router.post('/', async (req, res) => {
        const newVar = req.body;
        try {
            const error = new Error();
            if (!validator.validate(newVar, newSignSchema).valid) {
                error.message = 'Invalid request';
                error.code = 'ValidationException';
                throw error;
            }
            const id = req.body.id;
            const mobile = req.body.number;
            const name = req.body.name;
            const branch = req.body.branch;
            const year = req.body.year;
            const numbers = JSON.stringify(mobile);

            const result = await userDb.get(id);
            if (result !== null) {
                error.message = 'User Already exist';
                throw error;
            }
            const token = generatePassword(id);

            const insert = await userDb.create(id, mobile, token);

            let order = [];
            const participant = await participantDb.insert(id, name, mobile, year, branch, order);
            if (participant != null && insert != null) {
                res.status(200).json("user inserted \n participant inserted");
            }
            else {
                error.message = "Error related to insert participant data or to insert in user data";
                throw error;
            }
            const sender = process.env.SMS_SENDER;
            const apiKey = process.env.SMS_API_KEY;
            const test = process.env.SMS_TEST;
            const message = `Dear Event Manager, Your credentials for accessing the SMS portal for the event xyz are Username: ${id}, Password: ${token}
Team Udaan`;
            const apiRequest = {
                url: 'http://api.textlocal.in/send',
                form: {
                    apiKey,
                    numbers,
                    test,
                    sender,
                    message
                }
            };
            const apiResponse = await httpRequest.post(apiRequest);

        } catch (e) {
            if (e.code === 'ValidationException') {
                res.status(405).json({message: e.message});
            } else {
                console.log(e.message);
            }
        }
    });
    return router;
};
