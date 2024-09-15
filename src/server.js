import { Server, Origins } from 'boardgame.io/server';
import path from 'path';
import serve from 'koa-static';
import { nanoid } from 'nanoid';
import BlancMangerQQ from './game/game';
import answers from './data/answers.json';

const accentsMap = {
  a: 'á|à|ã|â|À|Á|Ã|Â',
  e: 'é|è|ê|É|È|Ê',
  i: 'í|ì|î|Í|Ì|Î|ï',
  o: 'ó|ò|ô|õ|Ó|Ò|Ô|Õ',
  u: 'ú|ù|û|ü|Ú|Ù|Û|Ü',
  c: 'ç|Ç',
  n: 'ñ|Ñ',
};

const slugify = (str) =>
  Object.keys(accentsMap).reduce(
    (acc, cur) => acc.replace(new RegExp(accentsMap[cur], 'g'), cur),
    str.replaceAll(/'/g, ''),
  );

function camelize(str) {
  return str
    .replace(/(?:^\w|[A-Z]|\b\w)/g, (word) => word.toUpperCase())
    .replace(/\s+/g, '');
}

const gameNames = [];
answers.forEach((anAnswer) => {
  if (anAnswer.match(/(\w+)/g).length <= 3) {
    gameNames.push(camelize(slugify(anAnswer)));
  }
});

const server = Server({
  games: [BlancMangerQQ],
  origins: [
    'http://bmq.querton.com/',
    Origins.LOCALHOST_IN_DEVELOPMENT,
    'http://192.168.1.39:3000',
  ],  
  uuid: () =>
    `${gameNames[Math.floor(Math.random() * gameNames.length)]}-${nanoid(3)}`,
});

const PORT = process.env.PORT || 8000;

// Build path relative to the server.js file
const frontEndAppBuildPath = path.resolve(__dirname, '../build');
server.app.use(serve(frontEndAppBuildPath));

server.run(PORT, () => {
  server.app.use(
    async (ctx, next) =>
      await serve(frontEndAppBuildPath)(
        Object.assign(ctx, { path: 'index.html' }),
        next,
      ),
  );
});
