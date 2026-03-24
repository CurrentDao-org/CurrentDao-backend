#!/bin/bash
# ============================================================================
# Terraform Automation Script
# ============================================================================
# This script provides automation for Terraform operations including:
# - Initialize Terraform
# - Plan infrastructure changes
# - Apply infrastructure changes
# - Destroy infrastructure
# - Format and validate code
# - Import existing resources

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
ENVIRONMENT="dev"
ACTION=""
TERRAFORM_VERSION="1.6.0"
AUTO_APPROVE=false

# Usage function
usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -e, --environment ENV   Environment to target (dev, staging, prod) [default: dev]"
    echo "  -a, --action ACTION     Action to perform (init, plan, apply, destroy, format, validate, import)"
    echo "  -v, --version VERSION   Terraform version [default: 1.6.0]"
    echo "  -y, --yes              Auto-approve apply/destroy"
    echo "  -h, --help             Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 -e dev -a plan"
    echo "  $0 -e staging -a apply -y"
    echo "  $0 -a format"
    echo "  $0 -e prod -a destroy -y"
    exit 1
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -a|--action)
            ACTION="$2"
            shift 2
            ;;
        -v|--version)
            TERRAFORM_VERSION="$2"
            shift 2
            ;;
        -y|--yes)
            AUTO_APPROVE=true
            shift
            ;;
        -h|--help)
            usage
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            usage
            ;;
    esac
done

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(dev|staging|prod)$ ]]; then
    echo -e "${RED}Invalid environment: $ENVIRONMENT${NC}"
    echo "Environment must be one of: dev, staging, prod"
    exit 1
fi

# Validate action
if [[ -z "$ACTION" ]]; then
    echo -e "${RED}Action is required${NC}"
    usage
fi

if [[ ! "$ACTION" =~ ^(init|plan|apply|destroy|format|validate|import)$ ]]; then
    echo -e "${RED}Invalid action: $ACTION${NC}"
    echo "Action must be one of: init, plan, apply, destroy, format, validate, import"
    exit 1
fi

# Print header
echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}  Terraform Automation Script        ${NC}"
echo -e "${BLUE}======================================${NC}"
echo -e "${YELLOW}Environment:${NC} $ENVIRONMENT"
echo -e "${YELLOW}Action:${NC} $ACTION"
echo -e "${YELLOW}Terraform Version:${NC} $TERRAFORM_VERSION"
echo ""

# Set working directory
WORKDIR="terraform/environments/$ENVIRONMENT"
cd "$(dirname "$0")/.."

# Check if terraform is installed
check_terraform() {
    if ! command -v terraform &> /dev/null; then
        echo -e "${YELLOW}Terraform not found. Installing...${NC}"
        brew install terraform@$TERRAFORM_VERSION || \
        wget -q https://releases.hashicorp.com/terraform/${TERRAFORM_VERSION}/terraform_${TERRAFORM_VERSION}_darwin_amd64.zip -O /tmp/terraform.zip && \
        unzip -o /tmp/terraform.zip -d /usr/local/bin/ && \
        rm /tmp/terraform.zip
    fi
    
    echo -e "${GREEN}Terraform version:${NC} $(terraform version)"
}

# Terraform Format
terraform_format() {
    echo -e "${BLUE}Formatting Terraform code...${NC}"
    terraform fmt -recursive -diff
    echo -e "${GREEN}Format complete!${NC}"
}

# Terraform Validate
terraform_validate() {
    echo -e "${BLUE}Validating Terraform code...${NC}"
    cd $WORKDIR
    terraform init -backend=false
    terraform validate
    echo -e "${GREEN}Validation complete!${NC}"
}

# Terraform Init
terraform_init() {
    echo -e "${BLUE}Initializing Terraform...${NC}"
    cd $WORKDIR
    terraform init
    echo -e "${GREEN}Initialization complete!${NC}"
}

# Terraform Plan
terraform_plan() {
    echo -e "${BLUE}Creating Terraform plan...${NC}"
    cd $WORKDIR
    
    if [ -f "../backend.tf" ]; then
        terraform plan -var-file="${ENVIRONMENT}.tfvars" -out=tfplan
    else
        terraform plan -var-file="${ENVIRONMENT}.tfvars" -out=tfplan
    fi
    
    echo -e "${GREEN}Plan created successfully!${NC}"
    
    # Show plan summary
    echo -e "${BLUE}Plan Summary:${NC}"
    terraform show -json tfplan | jq -r '.resource_changes | length' || true
}

# Terraform Apply
terraform_apply() {
    echo -e "${BLUE}Applying Terraform changes...${NC}"
    cd $WORKDIR
    
    if [ "$AUTO_APPROVE" = true ]; then
        terraform apply -auto-approve
    else
        terraform apply
    fi
    
    echo -e "${GREEN}Apply complete!${NC}"
}

# Terraform Destroy
terraform_destroy() {
    echo -e "${RED}WARNING: This will destroy all resources in $ENVIRONMENT!${NC}"
    
    if [ "$AUTO_APPROVE" = true ]; then
        echo -e "${YELLOW}Auto-approve enabled. Proceeding with destroy...${NC}"
    else
        read -p "Are you sure you want to continue? (yes/no): " CONFIRM
        if [ "$CONFIRM" != "yes" ]; then
            echo "Destroy cancelled."
            exit 0
        fi
    fi
    
    echo -e "${BLUE}Destroying Terraform resources...${NC}"
    cd $WORKDIR
    terraform destroy -var-file="${ENVIRONMENT}.tfvars" -auto-approve
    echo -e "${GREEN}Destroy complete!${NC}"
}

# Main execution
main() {
    check_terraform
    
    case $ACTION in
        format)
            terraform_format
            ;;
        validate)
            terraform_validate
            ;;
        init)
            terraform_init
            ;;
        plan)
            terraform_init
            terraform_plan
            ;;
        apply)
            terraform_init
            terraform_apply
            ;;
        destroy)
            terraform_destroy
            ;;
        import)
            echo -e "${YELLOW}Import requires additional parameters. Use: terraform import [options]${NC}"
            ;;
    esac
}

main
