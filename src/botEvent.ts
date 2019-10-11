import { Subject, } from 'rxjs';
import { Db, } from './database';

export const willSaveToDb$: Subject<void> = new Subject();
export const didSaveToDb$: Subject<Db.Mutate> = new Subject();

export const willAddEvent$: Subject<void> = new Subject();
export const didAddEvent$: Subject<void> = new Subject();

export const willDeleteEvent$: Subject<void> = new Subject();
export const didDeleteEvent$: Subject<void> = new Subject();

export const willEditEvent$: Subject<void> = new Subject();
export const didEditEvent$: Subject<void> = new Subject();

export const willEndEvent$: Subject<void> = new Subject();
export const didEndEvent$: Subject<void> = new Subject();
