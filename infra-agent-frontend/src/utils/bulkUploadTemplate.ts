/**
 * Column-header template for combined infrastructure bulk upload CSVs.
 * Derived from combined_cluster_1001.csv (L1–L4) with optional L5 sections.
 *
 * Ported verbatim from the Vite app's `utils/bulkUploadTemplate.ts`.
 */
export const BULK_UPLOAD_CSV_TEMPLATE = `# Infrastructure bulk upload template
# Each section starts with an object_type header row. Levels are processed 1 → 5.

# ------------------------------------------------------------------------------
# L1 — TAGS
# ------------------------------------------------------------------------------
object_type,name,slug,color,description

# ------------------------------------------------------------------------------
# L1 — MANUFACTURERS
# ------------------------------------------------------------------------------
object_type,name,slug,description

# ------------------------------------------------------------------------------
# L1 — DEVICE ROLES
# ------------------------------------------------------------------------------
object_type,name,slug,color,vm_role,description

# ------------------------------------------------------------------------------
# L1 — RACK ROLES
# ------------------------------------------------------------------------------
object_type,name,slug,color,description

# ------------------------------------------------------------------------------
# L1 — REGIONS
# ------------------------------------------------------------------------------
object_type,name,slug,description,parent

# ------------------------------------------------------------------------------
# L1 — SITE GROUPS
# ------------------------------------------------------------------------------
object_type,name,slug,description

# ------------------------------------------------------------------------------
# L1 — TENANT GROUPS
# ------------------------------------------------------------------------------
object_type,name,slug,description

# ------------------------------------------------------------------------------
# L1 — TENANTS
# ------------------------------------------------------------------------------
object_type,name,slug,group,description,cluster_id

# ------------------------------------------------------------------------------
# L2 — SITES
# ------------------------------------------------------------------------------
object_type,name,slug,status,region,group,facility,time_zone,description,physical_address,latitude,longitude,contact_name,contact_phone,contact_email

# ------------------------------------------------------------------------------
# L2 — LOCATIONS
# Hierarchy example: Building > Floor > Server-Room > Aisle
# ------------------------------------------------------------------------------
object_type,name,slug,site,parent,status,description

# ------------------------------------------------------------------------------
# L3 — DEVICE TYPES
# ------------------------------------------------------------------------------
object_type,manufacturer,model,slug,part_number,sku,u_height,is_full_depth,subdevice_role,airflow,weight,weight_unit

# ------------------------------------------------------------------------------
# L3 — RACKS
# ------------------------------------------------------------------------------
object_type,name,site,location,role,status,type,width,u_height,desc_units,serial,asset_tag,outer_width,outer_depth,outer_unit,tenant,comments

# ------------------------------------------------------------------------------
# L4 — DEVICES
# ------------------------------------------------------------------------------
object_type,name,device_type,device_role,site,rack,position,face,status,serial,asset_tag,location,tenant,description,comments,tags,primary_ip4,bmc_ip,bmc_type,bmc_username,vault_secret_path,bmc_password_dev,accelerators,gpu_count,service_tag,server_model

# ------------------------------------------------------------------------------
# L5 — INTERFACES (optional)
# ------------------------------------------------------------------------------
object_type,device,name,type,description,enabled,mgmt_only

# ------------------------------------------------------------------------------
# L5 — CABLES (optional)
# ------------------------------------------------------------------------------
object_type,termination_a_device,termination_a_interface,termination_b_device,termination_b_interface,type,description

# ------------------------------------------------------------------------------
# L5 — IP ADDRESSES (optional)
# ------------------------------------------------------------------------------
object_type,address,status,assigned_object_type,assigned_object_id,device,interface,description
`;

export const BULK_UPLOAD_TEMPLATE_FILENAME = "infrastructure-bulk-upload-template.csv";

export function downloadBulkUploadTemplate(filename = BULK_UPLOAD_TEMPLATE_FILENAME): void {
  const blob = new Blob([BULK_UPLOAD_CSV_TEMPLATE], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
