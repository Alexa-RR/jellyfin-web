import type { Api } from '@jellyfin/sdk';
import type { UserDto } from '@jellyfin/sdk/lib/generated-client';
import type { ApiClient, Event } from 'jellyfin-apiclient';
import React, { createContext, FC, useContext, useEffect, useState } from 'react';

import ServerConnections from '../components/ServerConnections';
import events from '../utils/events';
import { toApi } from '../utils/jellyfin-apiclient/compat';

interface JellyfinApiContext {
    __legacyApiClient__?: ApiClient
    api?: Api
    user?: UserDto
}

export const ApiContext = createContext<JellyfinApiContext>({});
export const useApi = () => useContext(ApiContext);

export const ApiProvider: FC = ({ children }) => {
    const [ legacyApiClient, setLegacyApiClient ] = useState<ApiClient>();
    const [ api, setApi ] = useState<Api>();
    const [ user, setUser ] = useState<UserDto>();

    useEffect(() => {
        ServerConnections.currentApiClient()
            ?.getCurrentUser()
            .then(newUser => updateApiUser(undefined, newUser))
            .catch(err => {
                console.info('[ApiProvider] Could not get current user', err);
            });

        const updateApiUser = (_e: Event | undefined, newUser: UserDto) => {
            setUser(newUser);

            if (newUser.ServerId) {
                setLegacyApiClient(ServerConnections.getApiClient(newUser.ServerId));
            }
        };

        const resetApiUser = () => {
            setLegacyApiClient(undefined);
            setUser(undefined);
        };

        events.on(ServerConnections, 'localusersignedin', updateApiUser);
        events.on(ServerConnections, 'localusersignedout', resetApiUser);

        return () => {
            events.off(ServerConnections, 'localusersignedin', updateApiUser);
            events.off(ServerConnections, 'localusersignedout', resetApiUser);
        };
    }, [ setLegacyApiClient, setUser ]);

    useEffect(() => {
        setApi(legacyApiClient ? toApi(legacyApiClient) : undefined);
    }, [ legacyApiClient, setApi ]);

    return (
        <ApiContext.Provider value={{
            __legacyApiClient__: legacyApiClient,
            api,
            user
        }}>
            {children}
        </ApiContext.Provider>
    );
};
