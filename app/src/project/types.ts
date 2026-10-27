export type PlacedBoard = {
  uid: string;
  boardId: string;
  // Absent only for the controller, which is the root of the tree.
  parentUid?: string;
  hostConnectorId?: string;
  // Values for the board's catalog options; missing ones use the option default.
  options?: Record<string, number>;
};

export type Project = {
  id: string;
  name: string;
  imageUri?: string;
  boards: PlacedBoard[];
  createdAt: number;
};
