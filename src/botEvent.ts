import { Subject, } from 'rxjs';

export const willSaveToDb$: Subject<Record<string, any>> = new Subject();
export const didSaveToDb$: Subject<boolean> = new Subject();

export const willAddEvent$: Subject<void> = new Subject();
export const didAddEvent$: Subject<void> = new Subject();

export const willDeleteEvent$: Subject<void> = new Subject();
export const didDeleteEvent$: Subject<void> = new Subject();

export const willEditEvent$: Subject<void> = new Subject();
export const didEditEvent$: Subject<void> = new Subject();

export const willEndEvent$: Subject<void> = new Subject();
export const didEndEvent$: Subject<void> = new Subject();
