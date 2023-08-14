import { QueryDescriptor, With } from 'thyseus';
function querySystem(query: Query<[
    A,
    B
], With<[
    C,
    D
]>>) { }
querySystem.parameters = [new QueryDescriptor([A, B], new With([C, D]))];
