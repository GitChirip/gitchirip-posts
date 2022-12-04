all:
	@echo "post  -  Create a micropost"

post:
	./scripts/create-post.sh

.PHONY: all post help
