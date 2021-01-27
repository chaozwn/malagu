import { ACCESS_ABSTAIN, ACCESS_DENIED, ACCESS_GRANTED, PolicyResolver, SecurityMetadata, SECURITY_EXPRESSION_CONTEXT_KEY } from './access-protocol';
import { eval } from 'jexl';
import { Component } from '@malagu/core';
import { Context } from '@malagu/web/lib/node';
import { AclPolicy, Effect, ElPolicy, Policy, PolicyType, Statement } from '../../common';
import { contains } from 'micromatch';

@Component(PolicyResolver)
export class ElPolicyResolver implements PolicyResolver {

    async resolve(policy: ElPolicy, securityMetadata: SecurityMetadata): Promise<number> {
        // eslint-disable-next-line no-eval
        if (await eval(policy.el, policy.context || Context.getAttr(SECURITY_EXPRESSION_CONTEXT_KEY)) === true) {
            return ACCESS_GRANTED;
        };
        return ACCESS_DENIED;
    }

    async support(policy: Policy, securityMetadata: SecurityMetadata): Promise<boolean> {
        return policy.type === PolicyType.el;
    }
}

@Component(PolicyResolver)
export class AclPolicyResolver implements PolicyResolver {

    protected match(pattern: string, resource: string) {
        return contains(resource, pattern);
    }

    protected toArray(value: string | string[]) {
        return Array.isArray(value) ? value : [value];

    }

    async resolve(policy: AclPolicy, securityMetadata: SecurityMetadata): Promise<number> {
        const acl = policy as AclPolicy;
        let grant = 0;
        for (const statement of acl.statement) {
            const result = this.resolveStatement(statement, securityMetadata);
            if (result === ACCESS_DENIED) {
                return ACCESS_DENIED;
            } else if (result === ACCESS_GRANTED) {
                grant++;
            }
        }
        if (grant > 0) {
            return ACCESS_GRANTED;
        }
        return ACCESS_ABSTAIN;
    }

    protected resolveStatement(statement: Statement, securityMetadata: SecurityMetadata) {
        const resources = this.toArray(statement.resource);
        for (const pattern of resources) {
            if (this.match(pattern, securityMetadata.resource)) {
                const actions = this.toArray(statement.action);
                for (const actionPattern of actions) {
                    if (this.match(actionPattern, securityMetadata.action)) {
                        if (statement.effect === Effect.Allow) {
                            return ACCESS_GRANTED;
                        }
                        return ACCESS_DENIED;
                    }
                }
                break;
            }
        }
        return ACCESS_ABSTAIN;
    }

    async support(policy: Policy, securityMetadata: SecurityMetadata): Promise<boolean> {
        return policy.type === PolicyType.acl;
    }
}
