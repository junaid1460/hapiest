import { Request, ResponseToolkit, RouteOptions, ServerRoute } from "hapi";
import { join } from "path";

interface IRouteSetOptions {
    baseUrl?: string;
    auth?: any;
}

export class HapiestRoutes {
    public routes: ServerRoute[];
}

function RouteSet(args: IRouteSetOptions) {
    return function<T extends typeof HapiestRoutes>(target: T) {
        const hapiTarget = (target as any) as Function;
        if (!hapiTarget.prototype.routes) {
            (hapiTarget as any).routes = [];
        }
        target.prototype.routes.forEach((e) => {
            const path: string[] = ["/"];
            if (args.baseUrl) {
                path.push(args.baseUrl);
            }
            path.push(e.path);
            e.path = join(...path);
            e.options = (e.options || {}) as RouteOptions;

            e.options!.auth = args.auth;
        });
        return hapiTarget as any;
    };
}

type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
type IRouteOptions = Omit<ServerRoute,  "method" | "handler">;
type HTTPMethods = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "OPTIONS"
type MakeOptional<T> = {[key in keyof T]?: T[key]}

export interface HapiestParams<T extends Omit<Request, "payload" | "params" | "headers" | "query"> = Request> {
    request: T,
    toolkit: ResponseToolkit,
    error?: Error,
}

function Route(method: HTTPMethods) {
    return function Get({vhost, rules, path, options}: MakeOptional<IRouteOptions> = {}) {
        return function<T extends HapiestRoutes, Z extends Request>(
            target: T,
            propertyKey: string | symbol,
            descriptor: TypedPropertyDescriptor<
                (
                  args: HapiestParams<Z>
                ) => any
            >,
        ) {
            if (!target.routes) {
                target.routes = [];
            }
            function handler(request: Z,
                toolkit: ResponseToolkit,
                error?: Error) {
                return descriptor.value!({ request: request, error: error, toolkit: toolkit})
            };
            let resolvedPath = path || propertyKey.toString()
        
            target.routes.push({
                vhost: vhost,
                options: options,
                rules: rules,
                handler: handler,
                path: resolvedPath,
                method: method,
            });
            return descriptor
        };
    };
}

/**
 * Namespace containing all the decorators
 */
export namespace Decorators {
    /**
     * Class decorator
     */
    export const routeGroup = RouteSet;

    /**
     * Methods decorators
     */
    export const get = Route("GET");
    export const post = Route("POST");
    export const put = Route("PUT")
    export const patch = Route("PATCH")
    export const del = Route("DELETE")
    export const option = Route("OPTIONS")
}


/**
 * Class which should be extended with custom module classes to
 * generate routes.
 */
export abstract class AbstractHapiModule {
    public routeSets: Array<typeof HapiestRoutes>;
    public baseUrl?: string;
    public auth?: any;

    public getRoutes(): ServerRoute[] {
        const routes: ServerRoute[] = [];
        for (const set of this.routeSets) {
            for (const route of set.prototype.routes) {
                if (this.baseUrl) {
                    route.path = join("/", this.baseUrl, route.path);
                }
                if (this.auth) {
                    route.options = (route.options || {}) as RouteOptions;
                    route.options.auth = this.auth;
                }
                routes.push(route);
            }
        }
        return routes;
    }
}


