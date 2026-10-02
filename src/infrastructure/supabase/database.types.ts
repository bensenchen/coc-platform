/**
 * Generated from `supabase/migrations` (kept in source control so browser and
 * Edge Function adapters compile against the deployed schema).
 * Regenerate with: npm run db:types
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Table<Row, Insert = Partial<Row>, Update = Partial<Insert>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};
type Audit = {
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  created_by: string | null;
};

export interface Database {
  public: {
    Tables: {
      workspace: Table<{ id: string; name: string; slug: string } & Audit>;
      workspace_member: Table<{
        workspace_id: string;
        user_id: string;
        role: 'workspace_admin' | 'viewer';
        created_at: string;
      }>;
      workspace_invitation: Table<{
        id: string;
        workspace_id: string;
        email: string;
        role: 'workspace_admin' | 'viewer';
        status: 'pending' | 'accepted' | 'expired' | 'revoked';
        invited_by: string | null;
        created_at: string;
        accepted_at: string | null;
      }>;
      project: Table<{ id: string; workspace_id: string; name: string; slug: string } & Audit>;
      project_member: Table<{
        project_id: string;
        user_id: string;
        role: 'project_editor' | 'commenter' | 'viewer';
        created_at: string;
      }>;
      page: Table<
        {
          id: string;
          project_id: string;
          kind: 'context' | 'org' | 'data' | 'data_view' | 'interface_list' | 'icd' | 'sheet';
          title: string;
          position: number;
          metadata: Json;
          url_key: string;
        } & Audit
      >;
      canvas_object: Table<
        {
          id: string;
          page_id: string;
          type: 'shape' | 'connector' | 'post_it' | 'mini_sheet' | 'attachment' | 'picture';
          name: string | null;
          position_x: number;
          position_y: number;
          width: number | null;
          height: number | null;
          rotation: number;
          z_index: number;
          is_physical: boolean;
          metadata: Json;
          url_key: string;
        } & Audit
      >;
      connector_anchor: Table<{
        connector_id: string;
        source_object_id: string | null;
        source_anchor: string | null;
        target_object_id: string | null;
        target_anchor: string | null;
        updated_at: string;
        version: number;
      }>;
      sheet_column: Table<{
        id: string;
        page_id: string;
        name: string;
        position: number;
        data_type: 'text' | 'number' | 'boolean' | 'date' | 'link';
        is_default: boolean;
        format: Json;
        updated_at: string;
        version: number;
      }>;
      sheet_row: Table<{
        id: string;
        page_id: string;
        position: number;
        canvas_object_id: string | null;
        format: Json;
        updated_at: string;
        version: number;
      }>;
      sheet_cell: Table<{
        row_id: string;
        column_id: string;
        value: Json;
        format: Json;
        updated_at: string;
        version: number;
      }>;
      interface: Table<{
        id: string;
        project_id: string;
        connector_id: string;
        display_id: string;
        icd_page_id: string | null;
        hidden: boolean;
        updated_at: string;
        version: number;
      }>;
      domain_audit_event: Table<{
        id: string;
        occurred_at: string;
        actor_id: string | null;
        entity_type: string;
        entity_id: string;
        action: 'insert' | 'update' | 'delete';
        before_state: Json | null;
        after_state: Json | null;
        workspace_id: string | null;
        project_id: string | null;
        page_id: string | null;
      }>;
      attachment: Table<{
        id: string;
        project_id: string;
        storage_path: string;
        file_name: string;
        mime_type: string | null;
        size_bytes: number | null;
        uploaded_by: string | null;
        created_at: string;
      }>;
      page_snapshot: Table<{
        id: string;
        page_id: string;
        taken_at: string;
        taken_by: string | null;
        content: Json;
      }>;
      subscription_entitlement: Table<{ workspace_id:string; feature_key:string; enabled:boolean; limit_value:number|null; valid_until:string|null; source:string; metadata:Json; updated_at:string }>;
      provider_connection: Table<{ id:string; workspace_id:string; provider:'google'; external_account_id:string; display_name:string; credential_ref:string; scopes:string[]; created_by:string|null; created_at:string; revoked_at:string|null }>;
      retrieval_audit_event: Table<{ id:string; occurred_at:string; workspace_id:string; project_id:string; actor_id:string|null; purpose:string; query_text:string|null; result_entity_ids:string[] }>;
    };
    Views: Record<string, never>;
    Functions: {
      has_feature: { Args:{p_workspace_id:string;p_feature_key:string}; Returns:boolean };
      take_page_snapshot: { Args:{p_page_id:string}; Returns:Database['public']['Tables']['page_snapshot']['Row'] };
      trace_entity_dependencies: { Args:{p_project_id:string;p_entity_id:string}; Returns:{direction:string;entity_type:string;entity_id:string;relationship:string}[] };
      retrieve_project_context: { Args:{p_project_id:string;p_query:string;p_purpose:string;p_limit?:number}; Returns:{entity_type:string;entity_id:string;title:string;content:string;source_ref:string;updated_at:string}[] };
      create_workspace_for_user: {
        Args: { workspace_name: string };
        Returns: Database['public']['Tables']['workspace']['Row'];
      };
      accept_my_invitations: { Args: Record<PropertyKey, never>; Returns: number };
      create_physical_data_link: {
        Args: { p_canvas_object_id: string; p_data_page_id: string };
        Returns: { canvas_object_id: string; sheet_row_id: string; data_page_id: string }[];
      };
      create_data_row_with_physical_object: {
        Args: {
          p_data_page_id: string;
          p_context_page_id?: string | null;
          p_new_context_title?: string | null;
          p_object_name?: string | null;
        };
        Returns: {
          canvas_object_id: string;
          sheet_row_id: string;
          context_page_id: string;
          data_page_id: string;
        }[];
      };
      delete_data_row_relationship: {
        Args: { p_sheet_row_id: string; p_delete_canvas_object?: boolean };
        Returns: {
          canvas_object_id: string | null;
          data_page_id: string;
          object_deleted: boolean;
        }[];
      };
      search_project_entities: {
        Args: { p_project_id: string; p_query?: string };
        Returns: {
          entity_type: 'page' | 'object';
          entity_id: string;
          title: string;
          context: string;
          url_key: string;
        }[];
      };
      resolve_entity_url: {
        Args: { p_url_key: string };
        Returns: {
          entity_type: 'page' | 'object';
          entity_id: string;
          title: string;
          path: string;
        }[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
