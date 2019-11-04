class ActionValueFunction {
    q = {};
    actions = [];
    n_actions = 0;
    preferred_action_i = -1; // Index of preferred action to take when in doubt, negative for none
    count_actions = {};  // Counter of actions taken
    ucb_c = 0.0;  // UCB degree of exploration

    constructor(actions, preferred_a = '', ucb_c=0.0) {
        if (actions && actions.length > 0) {
            this.actions = actions;
            this.n_actions = actions.length;
            for (let i=0; i<this.n_actions; i++) {
                let a = actions[i];
                this.count_actions[a] = 0;
                if (a === preferred_a) {
                    this.preferred_action_i = i;
                }
            }
            this.ucb_c = ucb_c;
        }
    }

    retrieve(state, action) {
        let state_data = this.getStateRepresentation(state);
        if (state_data in this.q && action in this.q[state_data]) {
            return this.q[state_data][action];
        } else {
            return 0.0;
        }
    }

    retrieveGreedy(state, t) {
        let action = this.greedyAction(state, t);
        return this.retrieve(state, action);
    }

    /**
     * Greedy double Q-learning: Given S, return A <- argmax_a(Q(S,a) + Q_B(S,a))
     * @param state; State for which to return best action
     * @param q_b; ActionValueFunction instance for second action-value function
     * @param t int: Agent's current time step
     * @returns string; Action yielding the best expected future return starting from S
     */
    greedyCombinedAction(state, q_b, t) {
        if (state) {
            let state_data = this.getStateRepresentation(state);
            if (state_data in this.q) {
                let tied_actions = [];
                let v = Number.NEGATIVE_INFINITY;
                for (let a in this.actions) {
                    let action = this.actions[a];
                    let g = this.retrieve(state_data, action);
                    if (q_b) {
                        g += q_b.retrieve(state_data, action);
                    }
                    if (this.ucb_c > 0) {
                        g += this.upper_confidence_bound(action, t);
                    }
                    if (g > v) {
                        v = g;
                        tied_actions = [action];
                    } else if (g === Number.POSITIVE_INFINITY || Math.abs(g - v) < 0.0001) {
                        tied_actions.push(action);
                    }
                }
                let chosen_a = null;
                if (this.preferred_action_i > 0) {
                    chosen_a = this.actions[this.preferred_action_i];
                }
                if (chosen_a === null || tied_actions.indexOf(chosen_a) === -1) {
                    chosen_a = tied_actions[Math.floor(Math.random() * tied_actions.length)];  // Random tie break
                }
                this.count_actions[chosen_a]++;
                return chosen_a;
            }
        }
        return this.getRandomAction();
    }

    /**
     * Greedy Q-learning: Given S, return A <- argmax_a(Q(S,a))
     * @param state; State for which to return best action
     * @param t int: Agent's current time step
     * @returns string; Action yielding the best expected future return starting from S
     */
    greedyAction(state, t) {
        return this.greedyCombinedAction(state, null, t);
    }

    /**
     * Given S, return A <- argmax_a(Q(S,a)), with eps probability of instead choosing an action randomly
     * @param state; State for which to return best action
     * @param eps; Probability of exploring a random action instead of acting greedily
     * @param t int: Agent's current time step
     * @returns string; Action yielding the best expected future return starting from S (or random action)
     */
    epsGreedyAction(state, eps, t) {
        return this.epsGreedyCombinedAction(state, eps, null, t);
    }

    /**
     * Given S, return A <- argmax_a(Q(S,a) + Q_B(S,a)), with eps probability of instead choosing an action randomly
     * (double Q-learning)
     * @param state; State for which to return best action
     * @param eps; Probability of exploring a random action instead of acting greedily
     * @param q_b; ActionValueFunction instance for second action-value function
     * @param t int: Agent's current time step
     * @returns string; Action yielding the best expected future return starting from S (or random action)
     */
    epsGreedyCombinedAction(state, eps, q_b, t) {
        if (eps > 0.01 && Math.random() <= eps) {
            return this.getRandomAction();
        }
        return this.greedyCombinedAction(state, q_b, t);
    }

    /**
     * Update rule: Q(s,a) <- Q(s,a) + value. Default value is zero.
     * @param state
     * @param action
     * @param value
     * @param update: True to update Q with new value, False to override old value with new one.
     */
    insert(state, action, value, update=false) {
        if (state) {
            let state_data = this.getStateRepresentation(state);
            if (state_data in this.q) {
                if (action in this.q[state_data]) {
                    if (update) {
                        this.q[state_data][action] += value;
                    } else {
                        this.q[state_data][action] = value;
                    }
                } else {
                    this.q[state_data][action] = value;
                }
            } else {
                this.q[state_data] = {};
                this.q[state_data][action] = value;
            }
        }
    }

    update(state, action, value) {
        this.insert(state, action, value, true);
    }

    /**
     * Returns the current UCB value for the given action
     * @param action: action to consider
     * @param t int: current time step
     */
    upper_confidence_bound(action, t) {
        if (action && t > 0 && action in this.count_actions) {
            if (this.count_actions[action] > 0) {
                return this.ucb_c * Math.sqrt(Math.log(t)/this.count_actions[action]);
            } else {
                return Number.POSITIVE_INFINITY;
            }
        }
        return 0.0;
    }

    getRandomAction() {
        let a = null;
        if (this.preferred_action_i > -1) {
            a = this.actions[this.preferred_action_i];
        } else {
            a =  this.actions[this.getRandomActionIndex()];
        }
        this.count_actions[a]++;
        return a;
    }

    getRandomActionIndex() {
        return Math.floor(Math.random() * this.n_actions);
    }

    getStateRepresentation(state) {
        let state_data = null;
        if (isTensor(state)) {
            state_data = state.dataSync();
        } else {
            state_data = state;
        }
        return state_data;
    }

    static argMax(array) {
        return array.map((x, i) => [x, i]).reduce((r, a) => (a[0] > r[0] ? a : r))[1];
    }

}
