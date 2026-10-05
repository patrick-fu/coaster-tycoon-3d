import {parentPort} from 'node:worker_threads';
import {create} from './fixtures.mjs';
import {createHost} from '../dist/simulation/host.js';
const handle=createHost(create());
parentPort.on('message',message=>parentPort.postMessage(handle(message)));
