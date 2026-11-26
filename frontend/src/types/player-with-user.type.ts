/**
 * A seated player with their user data.
 */
export type PlayerWithUserType = {
    playerId: string;
    userId: string;
    username: string;
    icon: string;
    isMarked: boolean;
    status: string;
    position: number;
    score: number;
    isActive: boolean;
    cardDesignId: string;
    cardDesignName: string;
}