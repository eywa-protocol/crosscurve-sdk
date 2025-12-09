# API Compatibility Fix Plan

## Problem Analysis

The SDK was built based on PRD document, but the actual API differs:

| Issue | SDK Implementation | Actual API |
|-------|-------------------|------------|
| Chains endpoint | `GET /chains` | `GET /networks` |
| Token list | `GET /tokenlist` | **Deprecated** - tokens embedded in `/networks` |
| Search param | `?query=value` | `?search=value` |
| Routing request | Correct format | Correct format (params wrapper + slippage at root) |

## Actual API Response Formats

### GET /networks
```json
{
  "arbitrum": {
    "name": "arbitrum",
    "icon": "https://...",
    "chainId": 42161,
    "rpcHttp": ["https://..."],
    "rpcPublic": "https://...",
    "hubChain": false,
    "router": "0x...",
    "tokens": [
      {
        "chainId": 42161,
        "address": "0x...",
        "name": "ETH",
        "symbol": "ETH",
        "decimals": 18,
        "tags": ["native", "can_swap"],
        ...
      }
    ]
  },
  "optimism": {...}
}
```

### GET /search?search=value
```json
{
  "result": "Not found"
}
// or array of transactions
```

### POST /routing/scan
Request (CORRECT in SDK):
```json
{
  "params": {
    "tokenIn": "0x...",
    "chainIdIn": 42161,
    "tokenOut": "0x...",
    "chainIdOut": 10,
    "amountIn": "1000000000000000000"
  },
  "slippage": 0.01
}
```

Response (array of quotes, not wrapped):
```json
[
  {
    "query": {...},
    "route": [...],
    "amountIn": "...",
    "amountOut": "...",
    "signature": "..."
  }
]
```

---

## Changes Required (Following Clean Architecture)

### Phase 1: Update Types (src/types/api/)

#### 1.1 responses.ts - Add NetworksResponse type
```typescript
// Raw API response from GET /networks
export interface NetworksApiResponse {
  [chainName: string]: {
    name: string;
    icon: string;
    chainId: number;
    rpcHttp: string[];
    rpcPublic: string;
    hubChain: boolean;
    router: string;
    curveFactory: string;
    frontHelper: string;
    claimHelper: string;
    walletFactory: string;
    nft: string;
    tokens: Token[];
    pools?: any[];
  };
}

// Update RoutingScanResponse - API returns array directly
export type RoutingScanResponse = Quote[];
```

### Phase 2: Update Endpoints (src/infrastructure/api/endpoints/)

#### 2.1 chains.ts → networks.ts (rename + rewrite)
- Change URL from `/chains` to `/networks`
- Transform map response to Chain[] array
- Extract CAIP-2 from chainId

#### 2.2 tokenlist.ts (update)
- Fetch from `/networks` instead of `/tokenlist`
- Extract all tokens from all chains
- No separate endpoint needed

#### 2.3 search.ts (update)
- Change query parameter from `query` to `search`

#### 2.4 routing.ts (update response handling)
- Response is array directly, not `{routes: Quote[]}`

### Phase 3: Update Services (src/application/services/)

#### 3.1 TokenService.ts
- Update to work with new networks response
- loadChains() transforms NetworksApiResponse → Chain[]
- loadTokens() extracts tokens from networks data

### Phase 4: Update Domain Interface (src/domain/interfaces/)

#### 4.1 IApiClient.ts
- Update method signatures if needed
- Add getNetworks() method, deprecate getChainList/getTokenList

---

## File Change List

### Files to Modify:

1. **src/types/api/responses.ts** (~30 lines changed)
   - Add NetworksApiResponse interface
   - Change RoutingScanResponse to array type

2. **src/infrastructure/api/endpoints/chains.ts** → **networks.ts** (~40 lines)
   - Rename file
   - Change URL to `/networks`
   - Add response transformation

3. **src/infrastructure/api/endpoints/tokenlist.ts** (~20 lines)
   - Fetch from networks, extract tokens

4. **src/infrastructure/api/endpoints/search.ts** (~5 lines)
   - Change `query` to `search` parameter

5. **src/infrastructure/api/endpoints/routing.ts** (~5 lines)
   - Handle array response directly

6. **src/infrastructure/api/endpoints/index.ts** (~5 lines)
   - Update export for renamed file

7. **src/application/services/TokenService.ts** (~30 lines)
   - Adapt to new response format

8. **src/domain/interfaces/IApiClient.ts** (~10 lines)
   - Update method signatures

9. **src/infrastructure/api/ApiClient.ts** (~10 lines)
   - Update to match interface

---

## Implementation Order

1. **Types first** - Update response types (no runtime impact)
2. **Endpoints** - Update infrastructure layer
3. **Services** - Update application layer
4. **Interface** - Update domain abstractions last

---

## Testing Strategy

After changes:
1. Run unit tests (should still pass - pure logic)
2. Run E2E API tests (should pass now)
3. Run E2E swap tests (optional - uses real funds)

---

## Rollback Strategy

All changes are additive/modifying. Git revert if issues.
