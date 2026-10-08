export interface QueryParam {
    key: string;
    value: string;
    active: boolean;
}

export function serializeQueryParams(queryParams: QueryParam[]): string {
    const params = new URLSearchParams();

    for (const param of queryParams) {
        if (param.key && param.active) {
            params.append(param.key, param.value);
        }
    }

    return params.toString()
        .split('&')
        .map(pair => {
            const separatorIndex = pair.indexOf('=');
            if (separatorIndex === -1) {
                return pair;
            }

            const encodedKey = pair.slice(0, separatorIndex).replace(/%24/gi, '$');
            return encodedKey + pair.slice(separatorIndex);
        })
        .join('&');
}
