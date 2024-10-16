import _ from 'lodash';
import {match} from 'path-to-regexp';

import {loadSpecs} from '../common/core.js';


const evaluateRule = (value, rule) => {
    if (rule.caseSensitive === false && typeof value === 'string' && typeof rule.value === 'string') {
        value = value.toLowerCase();
        rule.value = rule.value.toLowerCase();
    }

    const convertType = (val, targetType) => {
        switch (targetType) {
            case 'integer':
                return parseInt(val, 10);
            case 'number':
                return parseFloat(val);
            case 'boolean':
                return val === 'true' || val === true;
            default:
                return val;
        }
    };

     // Handle array conditions
    const evaluateArrayCondition = (arrayValue, rule) => {
        switch (rule.arrayOperator) {
            case 'contains':
                return arrayValue.includes(rule.value);
            case 'any':
                return arrayValue.some(val => evaluateRule(val, { ...rule, arrayOperator: undefined }));
            case 'all':
                return arrayValue.every(val => evaluateRule(val, { ...rule, arrayOperator: undefined}));
            default:
                return false;
        }
    };

     if (Array.isArray(value)) {
         return evaluateArrayCondition(value, rule);
     }

    const targetType = typeof rule.value;
    value = convertType(value, targetType);

    switch (rule.operator) {
        case 'lte':
            return value <= rule.value;
        case 'gte':
            return value >= rule.value;
        case 'lt':
            return value < rule.value;
        case 'gt':
            return value > rule.value;
        case 'eq':
        default:
            return _.isEqual(value, rule.value);
    }
};

const evaluateCondition = (req, condition) => {
    const evaluateRuleByLocation = (location, field, rule) => {
        let value;
        switch (location) {
            case 'header':
                value = req.headers[field.toLowerCase()];
                break;
            case 'query':
                value = req.query[field];
                break;
            case 'path':
                value = req.pathParams[field];
                break;
            case 'body':
            default:
                value = _.get(req.body, field);
                break;
        }
        return evaluateRule(value, rule);
    };

    if (condition.type === 'and') {
        return condition.rules.every(rule => evaluateRuleByLocation(rule.location, rule.field, rule));
    } else if (condition.type === 'or') {
        return condition.rules.some(rule => evaluateRuleByLocation(rule.location, rule.field, rule));
    }
    return false;
};


const generateCustomLogicMiddleware = () => {
    const specs = loadSpecs('../specs');
    const customLogic = [];

    specs.forEach(spec => {
        Object.entries(spec.paths).forEach(([path, methods]) => {
            Object.entries(methods).forEach(([method, details]) => {
                if (details['x-custom-logic']) {
                    customLogic.push({
                        pathMatcher: match(path.replace(/{/g, ':').replace(/}/g, '')),
                        method: method.toUpperCase(),
                        logic: details['x-custom-logic']
                    });
                }
            });
        });
    });

    return (req, res, next) => {
        const matchingLogic = customLogic.find(logic => {
            return logic.pathMatcher(req.path) && logic.method === req.method
        });

        if (matchingLogic) {
            const {logic, pathMatcher} = matchingLogic;

            if (logic.type === 'conditionalResponse') {
                req.pathParams = pathMatcher(req.path).params
                const matchedCondition = logic.conditions.find(condition => evaluateCondition(req, condition));
                if (matchedCondition) {
                    const {statusCode = 200, body = {}, headers = {}} = matchedCondition.response;
                    return res.status(statusCode).set(headers).json(body);
                }
            }
        }

        delete req["body"];
        delete req.headers["content-type"];
        delete req.headers['content-length'];
        next();
    };
};

export default generateCustomLogicMiddleware;