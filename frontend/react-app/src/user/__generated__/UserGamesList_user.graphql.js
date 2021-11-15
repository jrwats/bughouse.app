/**
 * @flow
 */

/* eslint-disable */

'use strict';

/*::
import type { ReaderFragment } from 'relay-runtime';
import type { FragmentReference } from "relay-runtime";
declare export opaque type UserGamesList_user$ref: FragmentReference;
declare export opaque type UserGamesList_user$fragmentType: UserGamesList_user$ref;
export type UserGamesList_user = {|
  +uid: string,
  +games: ?{|
    +edges: ?$ReadOnlyArray<?{|
      +node: ?{|
        +gid: string,
        +result: ?{|
          +board: ?number,
          +winner: ?number,
          +kind: ?number,
        |},
        +rated: ?boolean,
        +players: ?$ReadOnlyArray<?{|
          +uid: ?string,
          +handle: ?string,
          +rating: ?number,
        |}>,
      |}
    |}>,
    +pageInfo: {|
      +hasNextPage: boolean
    |},
  |},
  +id: string,
  +$refType: UserGamesList_user$ref,
|};
export type UserGamesList_user$data = UserGamesList_user;
export type UserGamesList_user$key = {
  +$data?: UserGamesList_user$data,
  +$fragmentRefs: UserGamesList_user$ref,
  ...
};
*/


const node/*: ReaderFragment*/ = (function(){
var v0 = [
  "games"
],
v1 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "uid",
  "storageKey": null
};
return {
  "argumentDefinitions": [
    {
      "kind": "RootArgument",
      "name": "count"
    },
    {
      "kind": "RootArgument",
      "name": "cursor"
    }
  ],
  "kind": "Fragment",
  "metadata": {
    "connection": [
      {
        "count": "count",
        "cursor": "cursor",
        "direction": "forward",
        "path": (v0/*: any*/)
      }
    ],
    "refetch": {
      "connection": {
        "forward": {
          "count": "count",
          "cursor": "cursor"
        },
        "backward": null,
        "path": (v0/*: any*/)
      },
      "fragmentPathInResult": [
        "node"
      ],
      "operation": require('./UserGamesListPaginationQuery.graphql'),
      "identifierField": "id"
    }
  },
  "name": "UserGamesList_user",
  "selections": [
    (v1/*: any*/),
    {
      "alias": "games",
      "args": null,
      "concreteType": "UserGameConnection",
      "kind": "LinkedField",
      "name": "__UserGamesList_games_connection",
      "plural": false,
      "selections": [
        {
          "alias": null,
          "args": null,
          "concreteType": "UserGameEdge",
          "kind": "LinkedField",
          "name": "edges",
          "plural": true,
          "selections": [
            {
              "alias": null,
              "args": null,
              "concreteType": "UserGame",
              "kind": "LinkedField",
              "name": "node",
              "plural": false,
              "selections": [
                {
                  "alias": null,
                  "args": null,
                  "kind": "ScalarField",
                  "name": "gid",
                  "storageKey": null
                },
                {
                  "alias": null,
                  "args": null,
                  "concreteType": "GameResult",
                  "kind": "LinkedField",
                  "name": "result",
                  "plural": false,
                  "selections": [
                    {
                      "alias": null,
                      "args": null,
                      "kind": "ScalarField",
                      "name": "board",
                      "storageKey": null
                    },
                    {
                      "alias": null,
                      "args": null,
                      "kind": "ScalarField",
                      "name": "winner",
                      "storageKey": null
                    },
                    {
                      "alias": null,
                      "args": null,
                      "kind": "ScalarField",
                      "name": "kind",
                      "storageKey": null
                    }
                  ],
                  "storageKey": null
                },
                {
                  "alias": null,
                  "args": null,
                  "kind": "ScalarField",
                  "name": "rated",
                  "storageKey": null
                },
                {
                  "alias": null,
                  "args": null,
                  "concreteType": "PlayerData",
                  "kind": "LinkedField",
                  "name": "players",
                  "plural": true,
                  "selections": [
                    (v1/*: any*/),
                    {
                      "alias": null,
                      "args": null,
                      "kind": "ScalarField",
                      "name": "handle",
                      "storageKey": null
                    },
                    {
                      "alias": null,
                      "args": null,
                      "kind": "ScalarField",
                      "name": "rating",
                      "storageKey": null
                    }
                  ],
                  "storageKey": null
                },
                {
                  "alias": null,
                  "args": null,
                  "kind": "ScalarField",
                  "name": "__typename",
                  "storageKey": null
                }
              ],
              "storageKey": null
            },
            {
              "alias": null,
              "args": null,
              "kind": "ScalarField",
              "name": "cursor",
              "storageKey": null
            }
          ],
          "storageKey": null
        },
        {
          "alias": null,
          "args": null,
          "concreteType": "PageInfo",
          "kind": "LinkedField",
          "name": "pageInfo",
          "plural": false,
          "selections": [
            {
              "alias": null,
              "args": null,
              "kind": "ScalarField",
              "name": "hasNextPage",
              "storageKey": null
            },
            {
              "alias": null,
              "args": null,
              "kind": "ScalarField",
              "name": "endCursor",
              "storageKey": null
            }
          ],
          "storageKey": null
        }
      ],
      "storageKey": null
    },
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "id",
      "storageKey": null
    }
  ],
  "type": "User",
  "abstractKey": null
};
})();
// prettier-ignore
(node/*: any*/).hash = '5ec0bcb1e24ad00042ea95cc18e959ef';

module.exports = node;
