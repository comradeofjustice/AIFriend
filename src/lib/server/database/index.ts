import { env } from '$env/dynamic/private';
import { UserStorage } from './storage';
let storage:UserStorage|undefined;
export function getUserStorage(){if(!env.AUTH_DATA_DIR)throw new Error('Database directory missing');return storage??=new UserStorage(env.AUTH_DATA_DIR);}
