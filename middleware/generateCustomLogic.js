import fs from 'fs';
import path from 'path';
import { parse } from '@stoplight/yaml';
import { fileURLToPath } from 'url';
import _ from 'lodash';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const loadSpecs = () => {
  const specsDir = path.join(__dirname, '../specs');
  const files = fs.readdirSync(specsDir).filter(file => file.endsWith('.yaml') || file.endsWith('.yml'));
  const specs = files.map(file => parse(fs.readFileSync(path.join(specsDir, file), 'utf8')));
  return specs;
};

const generateCustomLogicMiddleware = () => {
  const specs = loadSpecs();
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
        const condition = logic.conditions.find(cond => _.get(req.body, cond.field) === cond.value);
        if (condition) {
          return res.json(condition.response);
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