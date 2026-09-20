// The chain that says a row is this user's, carried into a read rather than asked as a question
// of its own. A read that takes one of these needs no permission check beside it: a row that comes
// back is one the caller may see, and nothing coming back is what `*Exists` then explains.
export interface ProjectOwner {
  user_public_id: string;
}

export interface EndpointGroupOwner extends ProjectOwner {
  project_public_id: string;
}

export interface EndpointOwner extends EndpointGroupOwner {
  endpoint_groups_public_id: string;
}
