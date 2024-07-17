import _ from 'lodash';

import { loadSpecs } from '../common/core.js';


const evaluateRule = (value, rule) => {
    if (rule.caseSensitive === false && typeof value === 'string' && typeof rule.value === 'string') {
        value = value.toLowerCase();
        rule.value = rule.value.toLowerCase();
    }

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
            return value === rule.value;
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
                        path,
                        method: method.toUpperCase(),
                        logic: details['x-custom-logic']
                    });
                }
            });
        });
    });

    return (req, res, next) => {
        const matchingLogic = customLogic.find(logic =>
            logic.path === req.path && logic.method === req.method
        );

        if (matchingLogic) {
            const { logic } = matchingLogic;

            if (logic.type === 'conditionalResponse') {
                const matchedCondition = logic.conditions.find(condition => evaluateCondition(req, condition));
                if (matchedCondition) {
                    const { statusCode = 200, body = {}, headers = {} } = matchedCondition.response;
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