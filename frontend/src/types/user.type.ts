/**
 * A user of the system.
 */
export type UserType = {
    userId: string;
    status: string;
    username: string;
    icon: string;
    currentDesignId: string;
    currentDesignName: string;
    tokens: number;
}