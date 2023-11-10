import { Query, With } from 'thyseus';
class A {}
class B {}
class C {}
class D {}
function querySystem(query: Query<[A, B], With<C, D>>) {}
